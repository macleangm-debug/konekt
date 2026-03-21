// Backend registration snippets:
//
// from assignment_engine_service import *
// from payment_timeline_routes import router as payment_timeline_router
// from sales_intelligence_routes import router as sales_intelligence_router
// from staff_performance_routes import router as staff_performance_router
//
// app.include_router(payment_timeline_router)
// app.include_router(sales_intelligence_router)
// app.include_router(staff_performance_router)


// Frontend route snippets:
//
// import SalesQueueIntelligencePage from "../pages/staff/SalesQueueIntelligencePage";
// import StaffPerformanceDashboardPage from "../pages/staff/StaffPerformanceDashboardPage";
// import SupervisorPerformanceDashboardPage from "../pages/admin/SupervisorPerformanceDashboardPage";
//
// <Route path="/staff/queue-intelligence" element={<SalesQueueIntelligencePage />} />
// <Route path="/staff/performance" element={<StaffPerformanceDashboardPage />} />
// <Route path="/admin/supervisor-performance" element={<SupervisorPerformanceDashboardPage />} />
