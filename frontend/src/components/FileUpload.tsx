import React, { useRef } from 'react'
import { importFile } from '../data/dataImporter'
import './FileUpload.css'

export interface FileUploadProps {
  onSuccess: (data: any[], fileName: string) => void
  onError: (error: string) => void
  accept?: string
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onSuccess,
  onError,
  accept = '.csv,.geojson,.json,.gpkg,.shp',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const handleFileSelect = async (file: File) => {
    setIsLoading(true)
    try {
      const result = await importFile(file)
      if (result.success && result.data) {
        onSuccess(result.data, file.name)
      } else {
        onError(result.errors.join(', ') || result.message)
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  return (
    <div
      className={`file-upload ${isDragging ? 'dragging' : ''} ${isLoading ? 'loading' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="file-input"
        disabled={isLoading}
      />

      <div className="file-upload-content">
        {isLoading ? (
          <>
            <div className="spinner"></div>
            <p>Processing file...</p>
          </>
        ) : (
          <>
            <div className="upload-icon">📁</div>
            <p className="upload-text">
              Drag and drop a file here or{' '}
              <button
                type="button"
                className="browse-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                browse
              </button>
            </p>
            <p className="upload-hint">Supported formats: CSV, GeoJSON, GeoPackage, Shapefile</p>
          </>
        )}
      </div>
    </div>
  )
}
