"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/components/auth/auth-provider"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { formatDistanceToNow } from "date-fns"
import { MessageCircle, Send, Trash, ImageIcon, X } from "lucide-react"
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
import { Input } from "@/components/ui/input"

interface Post {
  id: string
  content: string
  image_url?: string // Added image_url
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
}

export function PostFeed({ courseId, title = "General Discussion" }: PostFeedProps) {
  const { user, profile } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newPostContent, setNewPostContent] = useState("")
  const [newPostImage, setNewPostImage] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [newComments, setNewComments] = useState<Record<string, string>>({})
  const imageInputRef = useRef<HTMLInputElement>(null)

  const isOrganizerOrMain =
    profile?.role === "main_organizer" ||
    (profile?.id &&
      courseId &&
      profile.id === user?.id &&
      profile?.role === "student" &&
      posts.some((p) => p.author.id === profile.id && p.author.id === user?.id)) // Simplified check, will need proper organizer check
  const isUserOrganizerForCourse =
    profile?.role === "main_organizer" ||
    (profile && courseId && posts.some((p) => p.author.id === profile.id && p.author.id === user?.id)) // A more robust check might be needed.

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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewPostImage(e.target.files[0])
    }
  }

  const handleSubmitPost = async () => {
    if (!newPostContent.trim() && !newPostImage) return
    if (!user) {
      alert("Please sign in to post.")
      return
    }

    setSubmitting(true)
    let imageUrl = null

    try {
      if (newPostImage) {
        const fileExt = newPostImage.name.split(".").pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from("post-images").upload(fileName, newPostImage)

        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from("post-images").getPublicUrl(fileName)
        imageUrl = urlData.publicUrl
      }

      const { error } = await supabase.from("posts").insert({
        content: newPostContent.trim(),
        image_url: imageUrl,
        author_id: user.id,
        course_id: courseId || null,
      })

      if (error) throw error

      // Award credits for posting
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: 2,
        reason: courseId ? `Post in ${title}` : "Post in General Discussion",
        issuer_id: user.id, // Self-issued credit
      })

      setNewPostContent("")
      setNewPostImage(null)
      if (imageInputRef.current) imageInputRef.current.value = ""
      await fetchPosts()
    } catch (error) {
      console.error("Error creating post:", error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitComment = async (postId: string) => {
    const commentContent = newComments[postId]
    if (!commentContent?.trim()) return
    if (!user) {
      alert("Please sign in to comment.")
      return
    }

    try {
      const { error } = await supabase.from("comments").insert({
        content: commentContent.trim(),
        post_id: postId,
        author_id: user.id,
      })

      if (error) throw error

      // Award credits for commenting
      await supabase.from("credit_transactions").insert({
        user_id: user.id,
        amount: 1,
        reason: "Comment on a post",
        issuer_id: user.id, // Self-issued credit
      })

      setNewComments((prev) => ({ ...prev, [postId]: "" }))
      await fetchPosts()
    } catch (error) {
      console.error("Error creating comment:", error)
    }
  }

  const handleDeletePost = async (postId: string, postImageUrl?: string) => {
    if (!user || (!isOrganizerOrMain && !posts.find((p) => p.id === postId && p.author.id === user.id))) {
      alert("You do not have permission to delete this post.")
      return
    }

    try {
      // Delete associated image from storage first
      if (postImageUrl) {
        const fileName = postImageUrl.split("/").pop()
        if (fileName) {
          const path = `${postImageUrl.split("/")[postImageUrl.split("/").length - 2]}/${fileName}` // user_id/filename
          const { error: storageError } = await supabase.storage.from("post-images").remove([path])
          if (storageError) console.error("Error deleting post image from storage:", storageError)
        }
      }

      const { error } = await supabase.from("posts").delete().eq("id", postId)
      if (error) throw error
      await fetchPosts()
    } catch (error) {
      console.error("Error deleting post:", error)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (
      !user ||
      (!isOrganizerOrMain && !posts.some((p) => p.comments.some((c) => c.id === commentId && c.author.id === user.id)))
    ) {
      alert("You do not have permission to delete this comment.")
      return
    }

    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId)
      if (error) throw error
      await fetchPosts()
    } catch (error) {
      console.error("Error deleting comment:", error)
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
      {user && ( // Only show if user is signed in
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Textarea
                placeholder="Share your thoughts, ask questions, or start a discussion..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="min-h-[100px]"
              />
              {newPostImage && (
                <div className="relative w-32 h-32">
                  <img
                    src={URL.createObjectURL(newPostImage) || "/placeholder.svg"}
                    alt="Preview"
                    className="w-full h-full object-cover rounded-md"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-black/50 text-white hover:bg-black/70"
                    onClick={() => {
                      setNewPostImage(null)
                      if (imageInputRef.current) imageInputRef.current.value = ""
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <div className="flex justify-between items-center">
                <Button variant="outline" size="sm" onClick={() => imageInputRef.current?.click()}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Attach Image
                </Button>
                <Input
                  type="file"
                  accept="image/*"
                  ref={imageInputRef}
                  className="hidden"
                  onChange={handleImageChange}
                />
                <Button onClick={handleSubmitPost} disabled={(!newPostContent.trim() && !newPostImage) || submitting}>
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
              {!user && <p className="text-sm text-gray-500 mt-2">Sign in to share your thoughts!</p>}
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
                  {user && (isOrganizerOrMain || user.id === post.author.id) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                          <Trash className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete your post and its associated
                            data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeletePost(post.id, post.image_url)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-gray-900 dark:text-gray-100 whitespace-pre-wrap">{post.content}</p>
                {post.image_url && (
                  <img
                    src={post.image_url || "/placeholder.svg"}
                    alt="Attached image"
                    className="mt-4 max-h-96 w-auto rounded-md object-contain"
                  />
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
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-sm">
                                  {comment.author?.display_name || "Anonymous User"}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                </span>
                              </div>
                              <p className="text-sm">{comment.content}</p>
                            </div>
                          </div>
                          {user && (isOrganizerOrMain || user.id === comment.author.id) && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-500 hover:text-red-600 self-center"
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your comment.
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
                      ))}

                      {/* New Comment Form */}
                      {user && ( // Only show if user is signed in
                        <div className="flex space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={profile?.avatar_url || ""} />
                            <AvatarFallback className="text-xs">
                              {profile?.display_name?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
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
