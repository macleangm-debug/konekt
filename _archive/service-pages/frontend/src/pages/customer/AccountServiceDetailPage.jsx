import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ServicePageTemplate from "../../components/services/ServicePageTemplate";
import PageHeader from "../../components/ui/PageHeader";
import api from "../../lib/api";

export default function AccountServiceDetailPage() {
  const { slug } = useParams();
  const [service, setService] = useState(null);

  useEffect(() => {
    const load = async () => {
      const res = await api.get("/api/public-services/types");
      const found = (res.data || []).find((x) => x.slug === slug);
      if (found) setService(found);
    };
    load();
  }, [slug]);

  if (!service) return <div className="p-10">Loading service...</div>;

  return (
    <div className="space-y-8">
      <PageHeader
        title={service.name}
        subtitle="You are in account mode, so you can go directly into the structured service request or business pricing flow."
      />

      <ServicePageTemplate
        service={service}
        isLoggedIn={true}
        accountMode={true}
      />
    </div>
  );
}
