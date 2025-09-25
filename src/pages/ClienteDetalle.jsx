import React from "react";
import { useParams } from "react-router-dom";
import CustomerDetail from "../components/CustomerDetail";

export default function ClienteDetallePage() {
  const { id } = useParams();
  return (
    <div className="p-6">
      <CustomerDetail customerId={id} />
    </div>
  );
}