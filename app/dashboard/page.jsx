import React from "react";
import SideBar from "../components/SideBar";
import GISMap from "../components/GISMap";
import AdminLayout from "../components/AdminLayout";
export default function Dashboard() {
  return (
    <AdminLayout>
      <GISMap />
    </AdminLayout>
  );
}