import svgPaths from "./svg-pqyflim8c2";
import imgAvatarImage from "./cfa90523740b88f37cf837b3a4b69c4f932d514c.png";

function Icon() {
  return (
    <div className="bg-[#171717] content-stretch flex items-center justify-center relative rounded-[10px] shrink-0 size-[32px]" data-name="Icon">
      <div className="overflow-clip relative shrink-0 size-[16px]" data-name="lucide/gallery-vertical-end">
        <div className="absolute inset-[8.33%_12.5%]" data-name="Vector">
          <div className="absolute inset-[-3.75%_-4.17%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13 14.3333">
              <path d={svgPaths.p17c69700} id="Vector" stroke="var(--stroke-0, #FAFAFA)" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="content-stretch flex items-center p-[8px] relative shrink-0" data-name="Header">
      <Icon />
    </div>
  );
}

function MenuButton() {
  return (
    <div className="content-stretch flex h-[32px] items-center p-[8px] relative rounded-[8px] shrink-0" data-name="Menu_button">
      <div className="overflow-clip relative shrink-0 size-[16px]" data-name="lucide/terminal">
        <div className="absolute inset-[20.83%_16.67%]" data-name="Vector">
          <div className="absolute inset-[-5.36%_-4.69%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.6667 10.3333">
              <path d={svgPaths.p3d6791e0} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuButton1() {
  return (
    <div className="content-stretch flex h-[32px] items-center p-[8px] relative rounded-[8px] shrink-0" data-name="Menu_button">
      <div className="overflow-clip relative shrink-0 size-[16px]" data-name="lucide/bot">
        <div className="absolute inset-[16.67%_8.33%]" data-name="Vector">
          <div className="absolute inset-[-4.69%_-3.75%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14.3333 11.6667">
              <path d={svgPaths.p6ac2600} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuButton2() {
  return (
    <div className="content-stretch flex h-[32px] items-center p-[8px] relative rounded-[8px] shrink-0" data-name="Menu_button">
      <div className="overflow-clip relative shrink-0 size-[16px]" data-name="lucide/book-open">
        <div className="absolute inset-[12.5%_8.33%]" data-name="Vector">
          <div className="absolute inset-[-4.17%_-3.75%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14.3333 13">
              <path d={svgPaths.p20559b00} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuButton3() {
  return (
    <div className="content-stretch flex h-[32px] items-center p-[8px] relative rounded-[8px] shrink-0" data-name="Menu_button">
      <div className="overflow-clip relative shrink-0 size-[16px]" data-name="lucide/settings-2">
        <div className="absolute inset-[16.67%]" data-name="Vector">
          <div className="absolute inset-[-4.69%]">
            <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 11.6667 11.6667">
              <path d={svgPaths.p32bfd700} id="Vector" stroke="var(--stroke-0, #0A0A0A)" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function Menu() {
  return (
    <div className="content-stretch flex flex-col gap-[4px] items-start relative shrink-0" data-name="Menu">
      <MenuButton />
      <MenuButton1 />
      <MenuButton2 />
      <MenuButton3 />
    </div>
  );
}

function Sidebar() {
  return (
    <div className="flex-[1_0_0] min-h-px relative" data-name="Sidebar">
      <div className="content-stretch flex flex-col items-start p-[8px] relative size-full">
        <Menu />
      </div>
    </div>
  );
}

function Header1() {
  return (
    <div className="content-stretch flex items-center p-[8px] relative shrink-0" data-name="Header">
      <div className="relative rounded-[8px] shrink-0 size-[32px]" data-name="Circle">
        <div className="absolute inset-0 rounded-[8px]" data-name="avatar-image">
          <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none rounded-[8px] size-full" src={imgAvatarImage} />
        </div>
      </div>
    </div>
  );
}

export default function StateClosed() {
  return (
    <div className="bg-[#fafafa] content-stretch flex flex-col items-start relative rounded-[10px] size-full" data-name="State=Closed">
      <div aria-hidden className="absolute border border-[#e5e5e5] border-solid inset-0 pointer-events-none rounded-[10px]" />
      <Header />
      <Sidebar />
      <Header1 />
    </div>
  );
}