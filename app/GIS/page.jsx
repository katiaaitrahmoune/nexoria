"use client";


import AdminLayout from "../components/AdminLayout";
import DangerBuildingMap from "../components/DangerBuildingMap";
export default function GISMapPage() {
  return (
    <AdminLayout>
      <DangerBuildingMap />
    </AdminLayout>
  );
}