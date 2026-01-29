import toast from 'react-hot-toast'

export async function share(title: string, url: string) {
  if (navigator.share) {
    await navigator.share({ title, url })
  } else {
    await navigator.clipboard.writeText(url)
    toast.success('링크가 복사되었습니다')
  }
}
