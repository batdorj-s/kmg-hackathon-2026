import imgHome from "./abc263d25bad5ff66213582f8a3017d4b311a6ed.png";

export default function Home() {
  return (
    <div className="relative size-full" data-name="Home">
      <div className="absolute h-[812px] left-0 top-0 w-[375px]" data-name="Home">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgHome} />
      </div>
    </div>
  );
}