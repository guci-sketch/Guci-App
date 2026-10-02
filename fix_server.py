with open("backend-src/server.ts", "r", encoding="utf-8") as f:
    content = f.read()

if 'if (import.meta.url === `file://${process.argv[1]}`)' not in content and 'if (require.main === module)' not in content:
    content = content.replace("startServer();", """
// Only start the server if run directly (not imported as a module in serverless)
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  startServer();
}
""")

with open("backend-src/server.ts", "w", encoding="utf-8") as f:
    f.write(content)
