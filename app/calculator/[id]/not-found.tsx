import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function CalculatorNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Calculator Not Found</CardTitle>
          <CardDescription>The calculator reference you're looking for doesn't exist or is invalid.</CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild>
            <Link href="/">Create New Calculator</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
