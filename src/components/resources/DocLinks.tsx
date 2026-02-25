"use client";

import { motion } from "framer-motion";
import { BookMarked, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DocLinksProps {
  docs: {
    title: string;
    link: string;
    description?: string;
  }[];
}

export default function DocLinks({ docs }: DocLinksProps) {
  if (!docs || docs.length === 0) return null;

  return (
    <Card className="glass-card border-0 shadow-xl overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-amber-500" /> Documentation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {docs.map((doc, index) => (
          <motion.a
            key={index}
            href={doc.link}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-amber-100 hover:bg-amber-50/30 transition-all duration-200 group"
          >
            <BookMarked className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">
                {doc.title}
              </h4>
              {doc.description && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{doc.description}</p>
              )}
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-amber-500 transition-colors flex-shrink-0 mt-0.5" />
          </motion.a>
        ))}
      </CardContent>
    </Card>
  );
}
