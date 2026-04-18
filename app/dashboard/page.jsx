import React from "react";
import GISMap from "../components/GISMap";
import AdminLayout from "../components/AdminLayout";

export default function Dashboard() {
  return (
    <AdminLayout>
     
      <GISMap />
    </AdminLayout>
  );
}