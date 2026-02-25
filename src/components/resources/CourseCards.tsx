"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Star, BookOpen, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CourseCardProps {
  courses: {
    name: string;
    registrationLink: string;
    description: string;
    rating: number;
    thumbnail: string;
    workload: string;
    platform?: string;
  }[];
}

export default function CourseCards({ courses }: CourseCardProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<number, boolean>>({});

  if (!courses || courses.length === 0) {
    return (
      <Card className="glass-card border-0 p-8 text-center">
        <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No courses available.</p>
      </Card>
    );
  }

  const displayedCourses = showAll ? courses : courses.slice(0, 4);

  const toggleDescription = (index: number) => {
    setExpandedDescriptions((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    for (let i = 0; i < 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < fullStars ? "text-amber-400 fill-amber-400" : "text-gray-300"
          }`}
        />
      );
    }
    return stars;
  };

  return (
    <Card className="glass-card border-0 shadow-xl overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-blue-500" /> Courses
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3 max-h-[520px] overflow-y-auto pr-1">
          {displayedCourses.map((course, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -2 }}
              className="rounded-xl bg-gray-50 border border-gray-100 hover:border-indigo-100 hover:shadow-md transition-all duration-200 overflow-hidden group"
            >
              {/* Thumbnail */}
              <div className="relative w-full h-24 bg-gray-200 overflow-hidden">
                <img
                  src={course.thumbnail}
                  alt={course.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='96' fill='%23f3f4f6'%3E%3Crect width='400' height='96' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239ca3af' font-size='14'%3ECourse%3C/text%3E%3C/svg%3E";
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                {course.platform && (
                  <Badge className="absolute top-2 right-2 text-[10px] bg-white/90 text-gray-700 border-0 shadow-sm">
                    {course.platform}
                  </Badge>
                )}
              </div>

              {/* Content */}
              <div className="p-3 space-y-2">
                <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-tight">
                  {course.name}
                </h4>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-0.5">{renderStars(course.rating)}</div>
                  <span className="text-xs text-gray-400">({course.rating})</span>
                </div>

                <p className="text-xs text-gray-500">{course.workload}</p>

                <p className="text-xs text-gray-400 leading-relaxed">
                  {expandedDescriptions[index]
                    ? course.description
                    : course.description.split(" ").slice(0, 15).join(" ") +
                      (course.description.split(" ").length > 15 ? "..." : "")}
                </p>

                {course.description.split(" ").length > 15 && (
                  <button
                    onClick={() => toggleDescription(index)}
                    className="text-indigo-500 hover:text-indigo-600 text-xs font-medium"
                  >
                    {expandedDescriptions[index] ? "Less" : "More"}
                  </button>
                )}

                <a
                  href={course.registrationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-medium transition-colors"
                >
                  Enroll <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {courses.length > 4 && (
          <Button
            variant="ghost"
            onClick={() => setShowAll(!showAll)}
            className="w-full text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium"
          >
            {showAll ? "Show Less" : `Show All (${courses.length})`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
