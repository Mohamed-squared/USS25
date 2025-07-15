"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatDistanceToNow } from "date-fns"
import { MessageCircle, Send, ImageIcon, Trash2 } from "lucide-react"
import Image from "next/image"

interface Post {
  id: string
  content: string
  image_url?: string
  created_at: string
  author: {
    id: string
    display_name: string
    avatar_url?: string
  }
  comments: Comment[]
}

interface Comment {
  id: string
  content: string
  created_at: string
  author: {
    id: string
    display_name: string
    avatar_url?: string
  }
}

interface PostFeedProps {
  courseId?: string
  title?: string
  isOrganizer?: boolean
}

export function PostFeed({ courseId, title = "General Discussion", isOrganizer = false }: PostFeedProps) {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newPost, setNewPost] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [newComments, setNewComments] = useState<Record<string, string>>({})
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const canModerate = profile?.role === "main_organizer" || isOrganizer

  useEffect(() => {
    fetchPosts()
  }, [courseId])

  const fetchPosts = async () => {
    try {
      let query = supabase
        .from("posts")
        .select(`
          id,
          content,
          image_url,
          created_at,
          author:profiles(id, display_name, avatar_url),
          comments(
            id,
            content,
            created_at,
            author:profiles(id, display_name, avatar_url)
          )
        `)
        .order("created_at", { ascending: false })

      if (courseId) {
        query = query.eq("course_id", courseId)
      } else {
        query = query.is("course_id", null)
      }

      const { data, error } = await query

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error("Error fetching posts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedImage(file)
      const reader = new FileReader()
      reader.onload = (e) => setImagePreview(e.target?.result as string)
      reader.readAsDataURL(file)
    }
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split(".").pop()
      const fileName = `${user!.id}/${Date.now()}.${fileExt}`

      const { data, error } = await supabase.storage.from("post-images").upload(fileName, file)

      if (error) throw error

      const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (error) {
      console.error("Error uploading image:", error)
      return null
    }
  }

  const handleSubmitPost = async () => {
    if (!newPost.trim() || !user) return

    setSubmitting(true)
    try {
      let imageUrl = null
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage)
      }

      const { error } = await supabase.from("posts").insert({
        content: newPost.trim(),
        author_id: user.id,
        course_id: courseId || null,
        image_url: imageUrl,
      })

      if (error) throw error

      setNewPost("")
      setSelectedImage(null)
      setImagePreview(null)
      await fetchPosts()
    } catch (error) {
      console.error("Error creating post:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const { error } = await supabase.from("posts").delete().eq("id", postId)

      if (error) throw error
      await fetchPosts()
    } catch (error) {
      console.error("Error deleting post:", error)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId)

      if (error) throw error
      await fetchPosts()
    } catch (error) {
      console.error("Error deleting comment:", error)
    }
  }

  const handleSubmitComment = async (postId: string) => {
    const commentContent = newComments[postId]
    if (!commentContent?.trim() || !user) return

    try {
      const { error } = await supabase.from("comments").insert({
        content: commentContent.trim(),
        post_id: postId,
        author_id: user.id,
      })

      if (error) throw error

      setNewComments((prev) => ({ ...prev, [postId]: "" }))
      await fetchPosts()
    } catch (error) {
      console.error("Error creating comment:", error)
    }
  }

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold font-playfair">{title}</h2>
      </div>

      {/* New Post Form */}
      {user && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Textarea
                placeholder="Share your thoughts, ask questions, or start a discussion..."
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                className="min-h-[100px]"
              />

              {imagePreview && (
                <div className="relative">
                  <Image
                    src={imagePreview || "/placeholder.svg"}
                    alt="Preview"
                    width={200}
                    height={200}
                    className="rounded-lg object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setSelectedImage(null)
                      setImagePreview(null)
                    }}
                  >
                    Remove
                  </Button>
                </div>
              )}

              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload">
                    <Button variant="outline" size="sm" asChild>
                      <span className="cursor-pointer">
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Attach Image
                      </span>
                    </Button>
                  </label>
                </div>

                <Button onClick={handleSubmitPost} disabled={!newPost.trim() || submitting}>
                  {submitting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Post
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Posts */}
      <div className="space-y-4">
        {posts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-gray-500 dark:text-gray-400">No posts yet. Be the first to start a discussion!</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <Avatar>
                      <AvatarImage src={post.author?.avatar_url || ""} />
                      <AvatarFallback>{post.author?.display_name?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold">{post.author?.display_name || "Anonymous User"}</h4>
                        <span className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {canModerate && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Post</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this post? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeletePost(post.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap mb-4">{post.content}</p>

                {post.image_url && (
                  <div className="mb-4">
                    <Image
                      src={post.image_url || "/placeholder.svg"}
                      alt="Post attachment"
                      width={500}
                      height={300}
                      className="rounded-lg object-cover max-w-full h-auto"
                    />
                  </div>
                )}

                {/* Comments Section */}
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleComments(post.id)}
                    className="text-gray-600 dark:text-gray-400"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    {post.comments.length} comment{post.comments.length !== 1 ? "s" : ""}
                  </Button>

                  {expandedComments.has(post.id) && (
                    <div className="mt-4 space-y-4">
                      {/* Existing Comments */}
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="flex space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={comment.author?.avatar_url || ""} />
                            <AvatarFallback className="text-xs">
                              {comment.author?.display_name?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-sm">
                                    {comment.author?.display_name || "Anonymous User"}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                  </span>
                                </div>
                                {canModerate && (
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button variant="ghost" size="sm">
                                        <Trash2 className="h-3 w-3 text-red-500" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Comment</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete this comment? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteComment(comment.id)}>
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                )}
                              </div>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* New Comment Form */}
                      {user && (
                        <div className="flex space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">You</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 space-y-2">
                            <Textarea
                              placeholder="Write a comment..."
                              value={newComments[post.id] || ""}
                              onChange={(e) => setNewComments((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              className="min-h-[60px]"
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSubmitComment(post.id)}
                              disabled={!newComments[post.id]?.trim()}
                            >
                              Comment
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
