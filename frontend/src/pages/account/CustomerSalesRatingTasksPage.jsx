import React, { useEffect, useState } from "react";
import { Star, Loader2 } from "lucide-react";
import axios from "axios";
import CompletedOrderRatingTaskCard from "../../components/ratings/CompletedOrderRatingTaskCard";
import SalesRatingModal from "../../components/ratings/SalesRatingModal";
import { useAuth } from "../../contexts/AuthContext";

const API_URL = process.env.REACT_APP_BACKEND_URL || "";

export default function CustomerSalesRatingTasksPage() {
  const { user } = useAuth();
  const customerId = user?.id || "demo-customer";
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/sales-ratings/pending-for-customer?customer_id=${customerId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setTasks(res.data || []);
    } catch (err) {
      console.error("Failed to load rating tasks:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [customerId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="sales-rating-tasks-page">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
            <Star className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <div className="text-4xl font-bold text-[#20364D]">Rate Your Sales Experience</div>
            <div className="text-slate-600 mt-2">Completed orders can generate a quick feedback task, just like rating a ride experience.</div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => (
          <CompletedOrderRatingTaskCard key={task.order_id} task={task} onRate={setActiveTask} />
        ))}
        {!tasks.length && (
          <div className="rounded-[2rem] border bg-white p-8 text-center">
            <Star className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <div className="text-xl font-bold text-slate-600">No pending rating tasks</div>
            <div className="text-slate-500 mt-2">You'll see tasks here after your orders are completed.</div>
          </div>
        )}
      </div>

      <SalesRatingModal
        open={!!activeTask}
        task={activeTask}
        customerId={customerId}
        onClose={() => setActiveTask(null)}
        onSubmitted={load}
      />
    </div>
  );
}
