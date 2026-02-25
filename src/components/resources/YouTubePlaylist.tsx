"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Play, Youtube, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface YouTubePlaylistProps {
  playlists: {
    title: string;
    link: string;
    thumbnail: string;
    channel: string;
    video_count?: string;
    description?: string;
  }[];
}

export default function YouTubePlaylist({ playlists }: YouTubePlaylistProps) {
  const [showAll, setShowAll] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!playlists || playlists.length === 0) {
    return (
      <Card className="glass-card border-0 p-8 text-center">
        <Youtube className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No playlists available.</p>
      </Card>
    );
  }

  const displayedPlaylists = showAll ? playlists : playlists.slice(0, 3);

  return (
    <Card className="glass-card border-0 shadow-xl overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-pink-500" />
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" /> YouTube Playlists
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {displayedPlaylists.map((playlist, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.01 }}
              className="flex gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-gray-200 transition-all duration-200 group cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Thumbnail */}
              <a
                href={playlist.link}
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex-shrink-0 w-[140px] h-[80px] rounded-lg overflow-hidden bg-gray-200"
              >
                <img
                  src={playlist.thumbnail}
                  alt={playlist.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='80' fill='%23f3f4f6'%3E%3Crect width='140' height='80' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='12'%3EVideo%3C/text%3E%3C/svg%3E";
                  }}
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: hoveredIndex === index ? 1 : 0 }}
                  className="absolute inset-0 bg-black/60 flex items-center justify-center"
                >
                  <Play className="w-6 h-6 text-white fill-white" />
                </motion.div>
                <div className="absolute bottom-1 right-1 bg-black/80 px-1.5 py-0.5 rounded text-[10px] text-white font-medium">
                  {playlist.video_count || "Playlist"}
                </div>
              </a>

              {/* Info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors">
                    {playlist.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-0.5">{playlist.channel}</p>
                  {playlist.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{playlist.description}</p>
                  )}
                </div>
                <a
                  href={playlist.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 mt-1"
                >
                  Watch <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {playlists.length > 3 && (
          <Button
            variant="ghost"
            onClick={() => setShowAll(!showAll)}
            className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium"
          >
            {showAll ? "Show Less" : `Show All (${playlists.length})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
