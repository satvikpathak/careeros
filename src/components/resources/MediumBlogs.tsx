"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, FileText, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface MediumBlogsProps {
  blogs: {
    title: string;
    link: string;
    author?: string;
    description?: string;
  }[];
}

export default function MediumBlogs({ blogs }: MediumBlogsProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<number, boolean>>({});

  if (!blogs || blogs.length === 0) {
    return (
      <Card className="glass-card border-0 p-8 text-center">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No blogs available.</p>
      </Card>
    );
  }

  const displayedBlogs = showAll ? blogs : blogs.slice(0, 3);

  const toggleDescription = (index: number) => {
    setExpandedDescriptions((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <Card className="glass-card border-0 shadow-xl overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-500" /> Articles & Blogs
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {displayedBlogs.map((blog, index) => {
            const description = blog.description || "";
            const shouldTruncate = description.length > 120;
            const isExpanded = expandedDescriptions[index];

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl bg-gray-50 border border-gray-100 hover:border-emerald-100 hover:bg-emerald-50/30 transition-all duration-200 group"
              >
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-900 leading-tight group-hover:text-emerald-700 transition-colors">
                    {blog.title}
                  </h4>
                  <p className="text-xs text-gray-400 font-medium">
                    By {blog.author || "Unknown Author"}
                  </p>

                  {description && (
                    <p className="text-xs text-gray-500 leading-relaxed">
                      {shouldTruncate && !isExpanded
                        ? `${description.slice(0, 120)}...`
                        : description}
                      {shouldTruncate && (
                        <button
                          onClick={() => toggleDescription(index)}
                          className="text-indigo-500 hover:text-indigo-600 ml-1 font-medium"
                        >
                          {isExpanded ? "Less" : "More"}
                        </button>
                      )}
                    </p>
                  )}

                  <a
                    href={blog.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 group/link"
                  >
                    Read Article
                    <ArrowRight className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5" />
                  </a>
                </div>
              </motion.div>
            );
          })}
        </div>

        {blogs.length > 3 && (
          <Button
            variant="ghost"
            onClick={() => setShowAll(!showAll)}
            className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium"
          >
            {showAll ? "Show Less" : `Show All (${blogs.length})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
