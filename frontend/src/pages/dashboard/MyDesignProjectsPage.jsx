import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";

export default function MyDesignProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get("/api/creative-projects/my");
        setProjects(res.data || []);
      } catch (error) {
        console.error("Failed to load projects:", error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-12 space-y-8">
        <div>
          <h1 className="text-4xl font-bold" data-testid="my-projects-title">My Design Projects</h1>
          <p className="mt-2 text-slate-600">
            Track your creative briefs, revisions, and progress.
          </p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div key={project.id} className="rounded-3xl border bg-white p-5" data-testid={`project-card-${project.id}`}>
              <div className="font-semibold text-lg">{project.service_title}</div>
              <div className="text-sm text-slate-500 mt-1">{project.company_name || "-"}</div>
              <div className="mt-3">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                  {project.status}
                </span>
              </div>
              <div className="text-sm text-slate-600 mt-4">
                {project.currency || "TZS"} {Number(project.total_price || 0).toLocaleString()}
              </div>
              <Link
                to={`/dashboard/designs/${project.id}`}
                className="inline-block mt-4 text-[#2D3E50] font-semibold hover:underline"
                data-testid={`open-project-${project.id}`}
              >
                Open Project &rarr;
              </Link>
            </div>
          ))}

          {!projects.length && (
            <div className="text-sm text-slate-500 col-span-full">No creative projects yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
