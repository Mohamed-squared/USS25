import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen, Users, Trophy, Calendar } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 font-playfair">
              Undergraduate Summer Seminar 2025
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              Join an intensive mathematical journey exploring advanced topics in Linear Algebra, Real Analysis, Number
              Theory, Graph Theory, and Machine Learning.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  Join the Community
                </Button>
              </Link>
              <Link href="/auth/signin">
                <Button variant="outline" size="lg" className="w-full sm:w-auto bg-transparent">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 font-playfair">
              Why Join USS25?
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Experience mathematics like never before with our interactive community platform
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center">
              <CardHeader>
                <BookOpen className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Expert-Led Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Learn from leading mathematicians in specialized courses designed for undergraduates
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <CardTitle>Collaborative Learning</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Engage with peers through discussions, share notes, and build lasting academic connections
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Trophy className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                <CardTitle>Credit System</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Earn credits for participation, attendance, and valuable contributions to the community
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Calendar className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <CardTitle>Structured Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Follow a carefully planned curriculum with compact learning pace
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Courses Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4 font-playfair">
              Course Offerings
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Dive deep into five carefully selected mathematical disciplines
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "Linear Algebra",
                description: "Comprehensive study of vector spaces, linear transformations, and matrix theory.",
              },
              {
                title: "Real Analysis",
                description: "Rigorous treatment of limits, continuity, differentiation, and integration.",
              },
              {
                title: "Number Theory",
                description: "Elementary and analytic number theory, including prime numbers and Diophantine equations.",
              },
              {
                title: "Graph Theory",
                description: "Study of graphs, networks, and their applications in mathematics.",
              },
              {
                title: "Machine Learning",
                description:
                  "Introduction to the mathematical methods used in Machine Learning and AI.",
              },
            ].map((course, index) => (
              <Card key={index} className="h-full">
                <CardHeader>
                  <CardTitle className="font-playfair">{course.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{course.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 dark:bg-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 font-playfair">
            Ready to Begin Your Mathematical Journey?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join motivated students in this transformative summer experience
          </p>
          <Link href="/auth/signup">
            <Button size="lg" variant="secondary">
              Get Started Today
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
