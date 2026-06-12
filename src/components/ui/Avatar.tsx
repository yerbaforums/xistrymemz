import Image from 'next/image'
import styles from './Avatar.module.css'

interface Props {
  src?: string | null
  alt: string
  size?: number
  className?: string
}

export default function Avatar({ src, alt, size = 36, className = '' }: Props) {
  const initials = alt.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className={`${styles.wrapper} ${className}`} style={{ width: size, height: size }}>
      {src ? (
        <Image src={src} alt={alt} width={size} height={size} className={styles.image} />
      ) : (
        <span className={styles.initials} style={{ fontSize: size * 0.4 }}>
          {initials}
        </span>
      )}
    </div>
  )
}
