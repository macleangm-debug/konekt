import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../../lib/api";

export default function CreativeProjectDetailPage() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [deliverables, setDeliverables] = useState([]);
  const [comment, setComment] = useState("");
  const [revisionMessage, setRevisionMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [projectRes, commentsRes, deliverablesRes] = await Promise.all([
        api.get(`/api/creative-projects/${projectId}`),
        api.get(`/api/creative-project-collab/${projectId}/comments`),
        api.get(`/api/creative-project-collab/${projectId}/deliverables`),
      ]);

      setProject(projectRes.data || null);
      setComments(commentsRes.data || []);
      setDeliverables(deliverablesRes.data || []);
    } catch (error) {
      console.error("Failed to load project:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const sendComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    
    try {
      await api.post(`/api/creative-project-collab/${projectId}/comments`, {
        message: comment,
      });
      setComment("");
      load();
    } catch (error) {
      console.error("Failed to send comment:", error);
    }
  };

  const requestRevision = async (e) => {
    e.preventDefault();
    if (!revisionMessage.trim()) return;
    
    try {
      await api.post(`/api/creative-project-collab/${projectId}/revisions`, {
        message: revisionMessage,
      });
      setRevisionMessage("");
      load();
    } catch (error) {
      console.error("Failed to request revision:", error);
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-50 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="bg-slate-50 min-h-screen p-10">
        <div className="text-center">
          <p className="text-slate-600">Project not found</p>
          <Link to="/dashboard/designs" className="text-[#2D3E50] underline mt-4 inline-block">
            Back to projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-12 grid xl:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-6">
          <div className="rounded-3xl border bg-white p-6" data-testid="project-header">
            <Link to="/dashboard/designs" className="text-sm text-slate-500 hover:underline mb-4 inline-block">
              &larr; Back to projects
            </Link>
            <h1 className="text-3xl font-bold">{project.service_title}</h1>
            <div className="text-sm text-slate-500 mt-2">{project.company_name || "-"}</div>
            <div className="mt-4">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                {project.status}
              </span>
            </div>
          </div>

          <div className="rounded-3xl border bg-white p-6" data-testid="project-conversation">
            <h2 className="text-2xl font-bold">Project Conversation</h2>
            <div className="space-y-3 mt-5 max-h-[400px] overflow-y-auto">
              {comments.map((item) => (
                <div key={item.id} className="rounded-2xl border bg-slate-50 p-4" data-testid={`comment-${item.id}`}>
                  <div className="text-sm text-slate-500">
                    {item.author_email || "-"} &bull; {item.author_role || "-"}
                  </div>
                  <div className="mt-2 text-slate-800">{item.message}</div>
                </div>
              ))}
              {!comments.length && (
                <div className="text-sm text-slate-500">No comments yet.</div>
              )}
            </div>

            <form onSubmit={sendComment} className="mt-5">
              <textarea
                className="w-full border rounded-xl px-4 py-3 min-h-[110px]"
                placeholder="Send a comment or ask a question"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                data-testid="comment-input"
              />
              <button 
                className="mt-4 rounded-xl bg-[#2D3E50] text-white px-5 py-3 font-medium"
                data-testid="send-comment-btn"
              >
                Send Comment
              </button>
            </form>
          </div>

          <div className="rounded-3xl border bg-white p-6" data-testid="revision-section">
            <h2 className="text-2xl font-bold">Request Revision</h2>
            <form onSubmit={requestRevision} className="mt-5">
              <textarea
                className="w-full border rounded-xl px-4 py-3 min-h-[110px]"
                placeholder="Describe the changes you want"
                value={revisionMessage}
                onChange={(e) => setRevisionMessage(e.target.value)}
                data-testid="revision-input"
              />
              <button 
                className="mt-4 rounded-xl border px-5 py-3 font-medium"
                data-testid="request-revision-btn"
              >
                Request Revision
              </button>
            </form>
          </div>
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border bg-white p-6" data-testid="deliverables-section">
            <h2 className="text-2xl font-bold">Deliverables</h2>
            <div className="space-y-3 mt-5">
              {deliverables.map((item) => (
                <a
                  key={item.id}
                  href={item.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-2xl border p-4 hover:bg-slate-50"
                  data-testid={`deliverable-${item.id}`}
                >
                  <div className="font-medium">{item.title}</div>
                  <div className="text-sm text-slate-500 mt-1">{item.file_type || "-"}</div>
                </a>
              ))}
              {!deliverables.length && (
                <div className="text-sm text-slate-500">No files delivered yet.</div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
