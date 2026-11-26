import Image from "next/image";

export function PortalBrand() {
  return (
    <div className="mb-6 flex flex-col items-center text-center">
      <Image src="/logo.png" alt="Rosan Finanças" width={620} height={530} priority className="h-auto w-44" />
      <p className="mt-2 text-sm text-[#D2B37D]">Portal do Cliente</p>
    </div>
  );
}
