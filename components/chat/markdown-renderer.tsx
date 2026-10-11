"use client"

import React, { memo } from "react"
import ReactMarkdown from "react-markdown"
import remarkMath from "remark-math"
import rehypeKatex from "rehype-katex"

interface MarkdownRendererProps {
  content: string
  className?: string
}

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className = "",
}: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none break-words leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          p({ children }) {
            return <p className="mb-2.5 last:mb-0">{children}</p>
          },
          ul({ children }) {
            return <ul className="my-2 list-disc pl-5 space-y-1">{children}</ul>
          },
          ol({ children }) {
            return <ol className="my-2 list-decimal pl-5 space-y-1">{children}</ol>
          },
          li({ children }) {
            return <li className="leading-snug">{children}</li>
          },
          h1({ children }) {
            return <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0">{children}</h1>
          },
          h2({ children }) {
            return <h2 className="text-base font-semibold mt-3 mb-1.5 first:mt-0">{children}</h2>
          },
          h3({ children }) {
            return <h3 className="text-sm font-semibold mt-2.5 mb-1 first:mt-0">{children}</h3>
          },
          strong({ children }) {
            return <strong className="font-semibold text-foreground">{children}</strong>
          },
          code({ className, children, ...props }) {
            const isInline = !className
            if (isInline) {
              return (
                <code
                  className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground font-normal border border-border/40"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            return (
              <pre className="my-3 overflow-x-auto rounded-xl border border-border/80 bg-background/80 p-3.5 font-mono text-xs shadow-inner">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            )
          },
          blockquote({ children }) {
            return (
              <blockquote className="my-2 border-l-2 border-primary/60 pl-3 italic text-muted-foreground">
                {children}
              </blockquote>
            )
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
