import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/ui/Button.jsx'
import SurfaceCard from '../components/ui/SurfaceCard.jsx'
import { useAppContext } from '../context/AppContext.jsx'
import { useToast } from '../context/ToastContext.jsx'
import { getPageBySlug } from '../utils/api.js'

function PagePreview() {
  const { slug = '' } = useParams()
  const { currentStore } = useAppContext()
  const { showToast } = useToast()
  const [page, setPage] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isCancelled = false

    async function loadPreviewPage() {
      if (!currentStore?.id || !slug) {
        setPage(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const nextPage = await getPageBySlug(slug, currentStore.id)

        if (!isCancelled) {
          setPage(nextPage)
        }
      } catch (error) {
        console.error(error)
        if (!isCancelled) {
          setPage(null)
        }

        if (error.status !== 404) {
          showToast(error.message || 'Unable to load page preview', 'error')
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    loadPreviewPage()

    return () => {
      isCancelled = true
    }
  }, [currentStore?.id, showToast, slug])

  if (isLoading) {
    return <p className="product-empty-state">Loading page preview...</p>
  }

  if (!page) {
    return (
      <SurfaceCard className="page-preview page-preview--empty">
        <p className="product-empty-state">Page not found.</p>
        <Button as={Link} to="/pages" variant="outline">
          Back to Pages
        </Button>
      </SurfaceCard>
    )
  }

  return (
    <div className="page-preview">
      <div className="page-preview__toolbar">
        <Button as={Link} to="/pages" variant="outline">
          Back to Pages
        </Button>
        <Button as={Link} to={`/pages/edit/${page.id}`} variant="outline">
          Edit Page
        </Button>
      </div>

      <article className="page-preview__document">
        <p className="page-preview__eyebrow">{page.status === 'published' ? 'Published' : 'Draft'}</p>
        <h1>{page.title}</h1>
        <div
          className="page-preview__content"
          dangerouslySetInnerHTML={{ __html: page.content || '<p>No content yet.</p>' }}
        />
      </article>
    </div>
  )
}

export default PagePreview
