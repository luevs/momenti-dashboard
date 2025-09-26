import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import CustomerDetail from "../components/CustomerDetail";

export default function ClienteDetallePage() {
  const { id } = useParams();
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching customer:", error);
      } else {
        setSelectedCustomer(data);
      }
    };

    fetchCustomer();
  }, [id]);

  if (!selectedCustomer) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-6">
      <CustomerDetail
        customer={selectedCustomer}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}