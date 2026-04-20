import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { getBlogs } from '../../utils/api.js'
import { formatBlogDate, normalizePost } from '../../utils/blogs.js'

function BlogArticle() {
  const { slug = '' } = useParams()
  const [searchParams] = useSearchParams()
  const storeId = searchParams.get('storeId')
  const [post, setPost] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCancelled = false

    async function loadPost() {
      if (!storeId) {
        setPost(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const response = await getBlogs(storeId)
        const nextPost = (response ?? [])
          .map(normalizePost)
          .find((entry) => entry.slug === slug && entry.isPublished)

        if (!isCancelled) {
          setPost(nextPost ?? null)
        }
      } catch (error) {
        console.error(error)
        if (!isCancelled) {
          setPost(null)
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadPost()

    return () => {
      isCancelled = true
    }
  }, [slug, storeId])

  if (isLoading) {
    return <main className="storefront-loading">Loading blog post...</main>
  }

  if (!post) {
    return (
      <main className="storefront-loading">
        <h1>Blog post not found</h1>
        <Link to="/">Back to store</Link>
      </main>
    )
  }

  return (
    <main className="blog-article-page">
      {post.thumbnail ? <img className="blog-article-page__image" src={post.thumbnail} alt={post.title} /> : null}
      <article className="blog-article-page__content">
        <p className="blog-article-page__date">{formatBlogDate(post.publishedAt || post.createdAt)}</p>
        <h1>{post.title}</h1>
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
    </main>
  )
}

export default BlogArticle
