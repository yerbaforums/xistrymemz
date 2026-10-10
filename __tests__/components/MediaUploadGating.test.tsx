import { render, screen, fireEvent } from '@testing-library/react'
import AudioUploader from '@/components/AudioUploader'
import ImageUploader from '@/components/ImageUploader'
import { ToastProvider } from '@/context/ToastContext'

function renderWithToast(ui: React.ReactElement) {
  return render(<ToastProvider>{ui}</ToastProvider>)
}

describe('AudioUploader link-only gating', () => {
  it('hides the byte-upload button by default and keeps link flow', () => {
    renderWithToast(<AudioUploader value={null} onChange={() => {}} />)
    // Upload control absent...
    expect(screen.queryByTitle('Upload audio')).toBeNull()
    // ...link control present
    expect(screen.getByTitle(/direct audio link/i)).toBeTruthy()
  })

  it('shows the upload button when explicitly opted in', () => {
    renderWithToast(<AudioUploader value={null} onChange={() => {}} allowUpload />)
    expect(screen.getByTitle('Upload audio')).toBeTruthy()
  })

  it('accepts a pasted audio link', () => {
    const onChange = jest.fn()
    renderWithToast(<AudioUploader value={null} onChange={onChange} />)
    fireEvent.click(screen.getByTitle(/direct audio link/i))
    const input = screen.getByPlaceholderText('https://example.com/episode.mp3')
    fireEvent.change(input, { target: { value: 'https://example.com/ep.mp3' } })
    fireEvent.click(screen.getByText('Add'))
    expect(onChange).toHaveBeenCalledWith('https://example.com/ep.mp3')
  })
})

describe('ImageUploader video gating', () => {
  it('hides video upload by default, keeps the link button', () => {
    renderWithToast(
      <ImageUploader images={[]} onChange={() => {}} videoUrl={null} onVideoUrlChange={() => {}} />
    )
    expect(screen.queryByTitle('Add a video')).toBeNull()
    expect(screen.getByTitle(/video link instead/i)).toBeTruthy()
  })

  it('shows video upload when explicitly opted in', () => {
    renderWithToast(
      <ImageUploader images={[]} onChange={() => {}} videoUrl={null} onVideoUrlChange={() => {}} allowVideoUpload />
    )
    expect(screen.getByTitle('Add a video')).toBeTruthy()
  })
})
