"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { FileText, Upload, Download, Calendar } from "lucide-react"
import { format } from "date-fns"

interface Material {
  id: string
  title: string
  file_url: string
  material_type: "organizer_note" | "recorded_lecture" | "student_contribution"
  created_at: string
  uploader: {
    display_name: string
  }
}

interface CourseMaterialsProps {
  courseId: string
  materialType: "organizer_note" | "recorded_lecture" | "student_contribution"
  canUpload: boolean
  title: string
}

export function CourseMaterials({ courseId, materialType, canUpload, title }: CourseMaterialsProps) {
  const { user } = useAuth()
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [uploadTitle, setUploadTitle] = useState("")
  const [uploadFile, setUploadFile] = useState<File | null>(null)

  useEffect(() => {
    fetchMaterials()
  }, [courseId, materialType])

  const fetchMaterials = async () => {
    try {
      const { data, error } = await supabase
        .from("course_materials")
        .select(`
          id,
          title,
          file_url,
          material_type,
          created_at,
          uploader:profiles(display_name)
        `)
        .eq("course_id", courseId)
        .eq("material_type", materialType)
        .order("created_at", { ascending: false })

      if (error) throw error
      setMaterials(data || [])
    } catch (error) {
      console.error("Error fetching materials:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadFile || !uploadTitle.trim() || !user) return

    setUploading(true)
    try {
      // Upload file to Supabase Storage
      const fileExt = uploadFile.name.split(".").pop()
      const fileName = `${courseId}/${Date.now()}.${fileExt}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("course-materials")
        .upload(fileName, uploadFile)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage.from("course-materials").getPublicUrl(fileName)

      // Save material record
      const { error: insertError } = await supabase.from("course_materials").insert({
        course_id: courseId,
        uploader_id: user.id,
        title: uploadTitle.trim(),
        file_url: urlData.publicUrl,
        material_type: materialType,
      })

      if (insertError) throw insertError

      setUploadTitle("")
      setUploadFile(null)
      setUploadDialogOpen(false)
      await fetchMaterials()
    } catch (error) {
      console.error("Error uploading material:", error)
    } finally {
      setUploading(false)
    }
  }

  const getMaterialTypeColor = (type: string) => {
    switch (type) {
      case "organizer_note":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "recorded_lecture":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
      case "student_contribution":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  const getMaterialTypeLabel = (type: string) => {
    switch (type) {
      case "organizer_note":
        return "Organizer Note"
      case "recorded_lecture":
        return "Recorded Lecture"
      case "student_contribution":
        return "Student Contribution"
      default:
        return type
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{title}</h3>
        {canUpload && (
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Material
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload {title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="Enter material title"
                  />
                </div>
                <div>
                  <Label htmlFor="file">File</Label>
                  <Input
                    id="file"
                    type="file"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md"
                  />
                </div>
                <Button
                  onClick={handleUpload}
                  disabled={!uploadFile || !uploadTitle.trim() || uploading}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Uploading...
                    </>
                  ) : (
                    "Upload"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {materials.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No materials uploaded yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {materials.map((material) => (
            <Card key={material.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <h4 className="font-medium">{material.title}</h4>
                      <Badge className={getMaterialTypeColor(material.material_type)}>
                        {getMaterialTypeLabel(material.material_type)}
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>By {material.uploader?.display_name || "Anonymous"}</span>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(new Date(material.created_at), "MMM d, yyyy")}
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={material.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
