import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'

interface ProfileImageProps {
  currentPhotoPath: string
  altText: string
}

export function ProfileImage({ currentPhotoPath, altText }: ProfileImageProps) {
  const [imageUrl, setImageUrl] = useState<string>('/placeholder.svg')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!currentPhotoPath) {
      setImageUrl('/placeholder.svg')
      setLoading(false)
      return
    }

    const fetchSecureImage = async () => {
      try {
        setLoading(true)
        
        // Extract file path from S3 URL if needed
        let filePath = currentPhotoPath
        if (currentPhotoPath.includes('.s3.ap-northeast-2.amazonaws.com/')) {
          const urlParts = currentPhotoPath.split('.s3.ap-northeast-2.amazonaws.com/')
          filePath = urlParts[1] || currentPhotoPath
        }

        // Get auth token
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('Not authenticated')
        }

        // Call secure-download function with proper auth headers
        const { data, error } = await supabase.functions.invoke('secure-download', {
          body: {
            filePath,
            fileType: 'personal-photo'
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        })

        if (error) {
          console.error('Error fetching secure image:', error)
          throw error
        }

        if (data.success && data.downloadUrl) {
          // Fetch the actual image from the presigned URL
          const imageResponse = await fetch(data.downloadUrl)
          if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.status}`)
          }
          
          const imageBlob = await imageResponse.blob()
          const blobUrl = URL.createObjectURL(imageBlob)
          setImageUrl(blobUrl)
          console.log('Profile image loaded successfully via secure download')
        } else {
          throw new Error(data.error || 'Failed to get download URL')
        }
      } catch (error) {
        console.error('Failed to load profile image:', error)
        setImageUrl('/placeholder.svg')
      } finally {
        setLoading(false)
      }
    }

    fetchSecureImage()

    // Cleanup function to revoke blob URL
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl)
      }
    }
  }, [currentPhotoPath])

  if (loading) {
    return (
      <div className="w-full h-full bg-muted animate-pulse flex items-center justify-center">
        <div className="text-xs text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={altText}
      className="w-full h-full object-cover"
      onError={(e) => {
        console.error('Profile image failed to display');
        e.currentTarget.src = '/placeholder.svg';
      }}
    />
  )
}