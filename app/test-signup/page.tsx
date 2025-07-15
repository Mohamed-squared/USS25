import { TestSignup } from "@/components/test/test-signup"

export default function TestSignupPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Test User Registration</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Use this page to test the signup functionality and verify the database trigger works correctly.
        </p>
      </div>

      <TestSignup />

      <div className="max-w-2xl mx-auto mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h2 className="font-semibold mb-2">What this test checks:</h2>
        <ul className="text-sm space-y-1 list-disc list-inside">
          <li>User account creation in Supabase Auth</li>
          <li>Automatic profile creation via database trigger</li>
          <li>Proper handling of display_name from signup metadata</li>
          <li>Default role assignment ('student')</li>
          <li>Default credit initialization (0)</li>
          <li>Error handling and reporting</li>
        </ul>
      </div>
    </div>
  )
}
