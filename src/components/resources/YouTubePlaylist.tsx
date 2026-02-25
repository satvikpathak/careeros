"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Play, Youtube, ExternalLink, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface YouTubePlaylistProps {
  playlists: {
    title: string;
    link: string;
    thumbnail?: string;
    channel: string;
    video_count?: string;
    description?: string;
    search_query?: string;
  }[];
}

function getGradient(index: number): string {
  const gradients = [
    "from-red-500 to-orange-500",
    "from-pink-500 to-rose-500",
    "from-violet-500 to-purple-500",
    "from-blue-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-yellow-500",
  ];
  return gradients[index % gradients.length];
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

  const displayedPlaylists = showAll ? playlists : playlists.slice(0, 4);

  return (
    <Card className="glass-card border-0 shadow-xl overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-red-500 to-pink-500" />
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <Youtube className="w-5 h-5 text-red-500" /> YouTube Playlists
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 max-h-120 overflow-y-auto pr-1">
          {displayedPlaylists.map((playlist, index) => (
            <motion.a
              key={index}
              href={playlist.link}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.01 }}
              className="flex gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-100 hover:border-red-100 transition-all duration-200 group cursor-pointer"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className={`relative shrink-0 w-20 h-20 rounded-xl bg-linear-to-br ${getGradient(index)} flex items-center justify-center shadow-lg`}>
                <motion.div
                  animate={{ scale: hoveredIndex === index ? 1.1 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {hoveredIndex === index ? (
                    <Play className="w-8 h-8 text-white fill-white" />
                  ) : (
                    <Youtube className="w-8 h-8 text-white" />
                  )}
                </motion.div>
                <div className="absolute -bottom-1 -right-1 bg-white px-1.5 py-0.5 rounded-md text-[9px] text-gray-600 font-bold shadow-sm border border-gray-100">
                  {playlist.video_count || "Playlist"}
                </div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 group-hover:text-red-600 transition-colors leading-tight">
                    {playlist.title}
                  </h4>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <Youtube className="w-3 h-3 text-red-400" />
                    {playlist.channel}
                  </p>
                </div>
                {playlist.description && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-1">{playlist.description}</p>
                )}
                <div className="flex items-center gap-1 text-xs font-medium text-red-500 group-hover:text-red-600 mt-1">
                  <Search className="w-3 h-3" />
                  Search on YouTube
                  <ExternalLink className="w-3 h-3 ml-0.5" />
                </div>
              </div>
            </motion.a>
          ))}
        </div>

        {playlists.length > 4 && (
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
