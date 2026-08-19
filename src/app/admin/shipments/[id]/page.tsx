import { ShipmentDetailView } from "@/components/admin/shipments/shipment-detail-view";
export default async function ShipmentPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <ShipmentDetailView shipmentId={id} />; }
