import svgPaths from "./svg-vrjqrg9thc";
import imgEllipse56 from "./d2fc781c62787b472e7df8dfff1d13e92745361d.png";
import imgEllipse57 from "./1b39a463aaa0b69f93c456e8afab422e3a88a8d1.png";
import imgEllipse58 from "./3d0316122beac542446f5f032b34ce070136fc26.png";
import imgEllipse59 from "./ca5e8109a85a3a3ce9565518d8b70f5c61fa3bd8.png";
import imgEllipse60 from "./9d36ab2f5b70b94b15ab67883fd8901147a68030.png";
import imgEllipse61 from "./3dfea5057544b8b9e7827b064719f8431f93ffd7.png";
import imgEllipse62 from "./576c9e4a845d06e1fc785bda0a89e8eccbe3675f.png";
import imgEllipse55 from "./020ba6ef3358e278b443b348252065d072c8792c.png";
import imgEllipse63 from "./e909a3dcb6d2b8028eaacb16acde0c101f9df3dd.png";
import imgEllipse64 from "./81c79d7110db9d728857c121b664f01ec125a652.png";

function Indicators() {
  return (
    <div className="absolute content-stretch flex gap-[6.5px] items-center right-[18.7px] top-[23px]" data-name="Indicators">
      <div className="h-[12px] relative shrink-0 w-[19.971px]" data-name="Elements / Signal">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.9707 12">
          <path d={svgPaths.pe92800} fill="var(--fill-0, white)" id="Cellular Connection" />
        </svg>
      </div>
      <div className="h-[12.5px] relative shrink-0 w-[17px]" data-name="Elements / Connection">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 17 12.5001">
          <path d={svgPaths.p2b7cea80} fill="var(--fill-0, white)" id="Wifi" />
        </svg>
      </div>
      <div className="h-[13px] overflow-clip relative shrink-0 w-[27.33px]" data-name="Elements / Battery">
        <div className="absolute border border-solid border-white inset-[0_8.53%_0_0] opacity-40 rounded-[4px]" data-name="Border" />
        <div className="absolute inset-[34.62%_0_34.62%_95.13%]" data-name="Cap">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1.33 4">
            <path d={svgPaths.p1847ee80} fill="var(--fill-0, white)" id="Cap" opacity="0.5" />
          </svg>
        </div>
        <div className="absolute bg-white inset-[15.38%_30.48%_15.38%_7.32%] rounded-[2px]" data-name="Capacity" />
      </div>
    </div>
  );
}

function MicCam() {
  return (
    <div className="absolute left-[282px] size-[6px] top-[6px]" data-name="Mic & Cam">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 6 6">
        <g id="Mic & Cam">
          <g id="Mic/Cam Indicator" />
        </g>
      </svg>
    </div>
  );
}

function ElementsTime() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute content-stretch flex items-center justify-center left-[calc(50%-131.5px)] top-[calc(50%+6px)]" data-name="Elements / Time">
      <div className="[word-break:break-word] flex flex-col font-['SF_Pro_Text:Semibold',sans-serif] justify-center leading-[0] not-italic relative shrink-0 text-[17px] text-center text-white tracking-[-0.5px] whitespace-nowrap" style={{ fontFeatureSettings: '"ss03"' }}>
        <p className="leading-[17px]">9:41</p>
      </div>
    </div>
  );
}

function StatusBarIPhone13Mini() {
  return (
    <div className="absolute h-[47px] left-0 overflow-clip top-0 w-[375px]" data-name="Status Bar / iPhone 13 Mini">
      <Indicators />
      <MicCam />
      <ElementsTime />
    </div>
  );
}

function Group3() {
  return (
    <div className="absolute contents inset-[15.63%_84.53%_15.63%_3.73%]">
      <div className="absolute bg-[#d9d9d9] inset-[15.63%_84.53%_15.63%_3.73%] opacity-0" />
      <div className="absolute inset-[37.5%_88.27%_37.5%_7.47%] overflow-clip" data-name="Icon/Back">
        <div className="absolute flex inset-[9.37%_6.25%_9.38%_6.25%] items-center justify-center" style={{ containerType: "size" }}>
          <div className="flex-none h-[100cqh] rotate-180 w-[100cqw]">
            <div className="relative size-full" data-name="Vector">
              <div className="absolute inset-[-1.92%_-1.79%]">
                <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14.5 13.5">
                  <path d={svgPaths.p26ad9200} fill="var(--fill-0, #C7F064)" id="Vector" stroke="var(--stroke-0, #C7F064)" strokeWidth="0.5" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="absolute h-[64px] left-0 top-[47px] w-[375px]" data-name="Header">
      <div className="absolute bg-white inset-0 opacity-0" />
      <Group3 />
      <p className="[word-break:break-word] absolute font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold inset-[31.25%_36.53%_31.25%_36.27%] leading-[1.5] text-[16px] text-center text-white whitespace-nowrap">Leaderboard</p>
    </div>
  );
}

function Rank() {
  return <div className="col-1 h-[22px] ml-[12px] mt-[21px] relative row-1 w-[14px]" data-name="Rank" />;
}

function Person() {
  return (
    <div className="col-1 content-stretch flex gap-[12px] items-center ml-[38px] mt-[8px] relative row-1 w-[165px]" data-name="Person">
      <div className="relative shrink-0 size-[32px]">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="32" src={imgEllipse56} width="32" />
      </div>
      <p className="[word-break:break-word] font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[14.4px] text-white whitespace-nowrap">Marsha Fisher</p>
    </div>
  );
}

function Group4() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0">
      <div className="bg-[#252728] col-1 h-[48px] ml-0 mt-0 relative rounded-[12px] row-1 w-[343px]" />
      <p className="[word-break:break-word] col-1 font-['Plus_Jakarta_Sans:Regular',sans-serif] font-normal leading-[1.5] ml-[284px] mt-[13px] relative row-1 text-[14.4px] text-right text-white whitespace-nowrap">36 pts</p>
      <Rank />
      <p className="[word-break:break-word] col-1 font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] ml-[16px] mt-[13px] relative row-1 text-[14.4px] text-center text-shadow-[0px_0px_13px_rgba(0,0,0,0.25)] text-white whitespace-nowrap">4</p>
      <Person />
    </div>
  );
}

function Rank1() {
  return <div className="col-1 h-[22px] ml-[12px] mt-[21px] relative row-1 w-[14px]" data-name="Rank" />;
}

function Person1() {
  return (
    <div className="col-1 content-stretch flex gap-[12px] items-center ml-[38px] mt-[8px] relative row-1 w-[165px]" data-name="Person">
      <div className="relative shrink-0 size-[32px]">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="32" src={imgEllipse57} width="32" />
      </div>
      <p className="[word-break:break-word] font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[14.4px] text-white whitespace-nowrap">Juanita Cormier</p>
    </div>
  );
}

function Group5() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0">
      <div className="bg-[#252728] col-1 h-[48px] ml-0 mt-0 relative rounded-[12px] row-1 w-[343px]" />
      <p className="[word-break:break-word] col-1 font-['Plus_Jakarta_Sans:Regular',sans-serif] font-normal leading-[1.5] ml-[284px] mt-[13px] relative row-1 text-[14.4px] text-right text-white whitespace-nowrap">35 pts</p>
      <Rank1 />
      <p className="[word-break:break-word] col-1 font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] ml-[17px] mt-[13px] relative row-1 text-[14.4px] text-center text-shadow-[0px_0px_13px_rgba(0,0,0,0.25)] text-white whitespace-nowrap">5</p>
      <Person1 />
    </div>
  );
}

function Rank2() {
  return <div className="col-1 h-[22px] ml-[12px] mt-[21px] relative row-1 w-[14px]" data-name="Rank" />;
}

function Person2() {
  return (
    <div className="col-1 content-stretch flex gap-[12px] items-center ml-[38px] mt-[8px] relative row-1 w-[165px]" data-name="Person">
      <div className="relative shrink-0 size-[32px]">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="32" src={imgEllipse58} width="32" />
      </div>
      <p className="[word-break:break-word] font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[14.4px] text-white whitespace-nowrap">You</p>
    </div>
  );
}

function Group6() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0">
      <div className="bg-[#536724] col-1 h-[48px] ml-0 mt-0 relative rounded-[12px] row-1 w-[343px]" />
      <p className="[word-break:break-word] col-1 font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] ml-[284px] mt-[13px] relative row-1 text-[14.4px] text-right text-white whitespace-nowrap">34 pts</p>
      <Rank2 />
      <p className="[word-break:break-word] col-1 font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] ml-[17px] mt-[13px] relative row-1 text-[14.4px] text-center text-shadow-[0px_0px_13px_rgba(0,0,0,0.25)] text-white whitespace-nowrap">6</p>
      <Person2 />
    </div>
  );
}

function Rank3() {
  return <div className="col-1 h-[22px] ml-[12px] mt-[21px] relative row-1 w-[14px]" data-name="Rank" />;
}

function Person3() {
  return (
    <div className="col-1 content-stretch flex gap-[12px] items-center ml-[38px] mt-[8px] relative row-1 w-[165px]" data-name="Person">
      <div className="relative shrink-0 size-[32px]">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="32" src={imgEllipse59} width="32" />
      </div>
      <p className="[word-break:break-word] font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[14.4px] text-white whitespace-nowrap">Tamara Schmidt</p>
    </div>
  );
}

function Group7() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0">
      <div className="bg-[#252728] col-1 h-[48px] ml-0 mt-0 relative rounded-[12px] row-1 w-[343px]" />
      <p className="[word-break:break-word] col-1 font-['Plus_Jakarta_Sans:Regular',sans-serif] font-normal leading-[1.5] ml-[284px] mt-[13px] relative row-1 text-[14.4px] text-right text-white whitespace-nowrap">33 pts</p>
      <Rank3 />
      <p className="[word-break:break-word] col-1 font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] ml-[17px] mt-[13px] relative row-1 text-[14.4px] text-center text-shadow-[0px_0px_13px_rgba(0,0,0,0.25)] text-white whitespace-nowrap">7</p>
      <Person3 />
    </div>
  );
}

function Rank4() {
  return <div className="col-1 h-[22px] ml-[12px] mt-[21px] relative row-1 w-[14px]" data-name="Rank" />;
}

function Person4() {
  return (
    <div className="col-1 content-stretch flex gap-[12px] items-center ml-[38px] mt-[8px] relative row-1 w-[165px]" data-name="Person">
      <div className="relative shrink-0 size-[32px]">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="32" src={imgEllipse60} width="32" />
      </div>
      <p className="[word-break:break-word] font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[14.4px] text-white whitespace-nowrap">Ricardo Veum</p>
    </div>
  );
}

function Group8() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0">
      <div className="bg-[#252728] col-1 h-[48px] ml-0 mt-0 relative rounded-[12px] row-1 w-[343px]" />
      <p className="[word-break:break-word] col-1 font-['Plus_Jakarta_Sans:Regular',sans-serif] font-normal leading-[1.5] ml-[284px] mt-[13px] relative row-1 text-[14.4px] text-right text-white whitespace-nowrap">32 pts</p>
      <Rank4 />
      <p className="[word-break:break-word] col-1 font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] ml-[16px] mt-[13px] relative row-1 text-[14.4px] text-center text-shadow-[0px_0px_13px_rgba(0,0,0,0.25)] text-white whitespace-nowrap">8</p>
      <Person4 />
    </div>
  );
}

function Rank5() {
  return <div className="col-1 h-[22px] ml-[12px] mt-[21px] relative row-1 w-[14px]" data-name="Rank" />;
}

function Person5() {
  return (
    <div className="col-1 content-stretch flex gap-[12px] items-center ml-[38px] mt-[8px] relative row-1 w-[165px]" data-name="Person">
      <div className="relative shrink-0 size-[32px]">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="32" src={imgEllipse61} width="32" />
      </div>
      <p className="[word-break:break-word] font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[14.4px] text-white whitespace-nowrap">Gary Sanford</p>
    </div>
  );
}

function Group9() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0">
      <div className="bg-[#252728] col-1 h-[48px] ml-0 mt-0 relative rounded-[12px] row-1 w-[343px]" />
      <p className="[word-break:break-word] col-1 font-['Plus_Jakarta_Sans:Regular',sans-serif] font-normal leading-[1.5] ml-[285px] mt-[13px] relative row-1 text-[14.4px] text-right text-white whitespace-nowrap">31 pts</p>
      <Rank5 />
      <p className="[word-break:break-word] col-1 font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] ml-[17px] mt-[13px] relative row-1 text-[14.4px] text-center text-shadow-[0px_0px_13px_rgba(0,0,0,0.25)] text-white whitespace-nowrap">9</p>
      <Person5 />
    </div>
  );
}

function Rank6() {
  return <div className="col-1 h-[22px] ml-[12px] mt-[21px] relative row-1 w-[14px]" data-name="Rank" />;
}

function Person6() {
  return (
    <div className="col-1 content-stretch flex gap-[12px] items-center ml-[38px] mt-[8px] relative row-1 w-[165px]" data-name="Person">
      <div className="relative shrink-0 size-[32px]">
        <img alt="" className="absolute block inset-0 max-w-none size-full" height="32" src={imgEllipse62} width="32" />
      </div>
      <p className="[word-break:break-word] font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[14.4px] text-white whitespace-nowrap">Becky Bartell</p>
    </div>
  );
}

function Group10() {
  return (
    <div className="grid-cols-[max-content] grid-rows-[max-content] inline-grid place-items-start relative shrink-0">
      <div className="bg-[#252728] col-1 h-[48px] ml-0 mt-0 relative rounded-[12px] row-1 w-[343px]" />
      <p className="[word-break:break-word] col-1 font-['Plus_Jakarta_Sans:Regular',sans-serif] font-normal leading-[1.5] ml-[284px] mt-[13px] relative row-1 text-[14.4px] text-right text-white whitespace-nowrap">30 pts</p>
      <Rank6 />
      <p className="[word-break:break-word] col-1 font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] ml-[13px] mt-[13px] relative row-1 text-[14.4px] text-center text-shadow-[0px_0px_13px_rgba(0,0,0,0.25)] text-white whitespace-nowrap">10</p>
      <Person6 />
    </div>
  );
}

function AutoLayoutVertical() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[8px] items-start leading-[0] left-[16px] top-[342px]" data-name="Auto Layout Vertical">
      <Group4 />
      <Group5 />
      <Group6 />
      <Group7 />
      <Group8 />
      <Group9 />
      <Group10 />
    </div>
  );
}

function Frame9() {
  return (
    <div className="-translate-x-1/2 absolute left-1/2 size-[28px] top-[94px]">
      <div className="absolute left-0 size-[28px] top-[4px]">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
          <circle cx="14" cy="14" fill="var(--fill-0, #363F2C)" id="Ellipse 78" r="14" />
        </svg>
      </div>
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] left-[calc(50%+0.5px)] text-[16px] text-center text-shadow-[0px_0px_13px_rgba(0,0,0,0.25)] text-white top-[calc(50%-8px)] whitespace-nowrap">1</p>
    </div>
  );
}

function Group() {
  return (
    <div className="-translate-x-1/2 absolute contents left-1/2 top-[24px]">
      <div className="-translate-x-1/2 absolute left-1/2 size-[84px] top-[24px]">
        <div className="absolute inset-[-3.57%]">
          <img alt="" className="block max-w-none size-full" height="90" src={imgEllipse55} width="90" />
        </div>
      </div>
      <Frame9 />
    </div>
  );
}

function Frame8() {
  return (
    <div className="absolute h-[159px] left-[146px] top-[101px] w-[84px]">
      <Group />
    </div>
  );
}

function Frame10() {
  return (
    <div className="absolute left-[17px] size-[28px] top-[60px]">
      <div className="absolute left-0 size-[28px] top-[4px]">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
          <circle cx="14" cy="14" fill="var(--fill-0, #363F2C)" id="Ellipse 78" r="14" />
        </svg>
      </div>
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] left-1/2 text-[16px] text-center text-shadow-[0px_0px_13px_rgba(0,0,0,0.25)] text-white top-[calc(50%-9px)] whitespace-nowrap">2</p>
    </div>
  );
}

function Group2() {
  return (
    <div className="absolute contents left-[-6px] top-0">
      <div className="absolute left-[-6px] size-[74px] top-0">
        <div className="absolute inset-[-4.05%]">
          <img alt="" className="block max-w-none size-full" height="80" src={imgEllipse63} width="80" />
        </div>
      </div>
      <Frame10 />
    </div>
  );
}

function Frame6() {
  return (
    <div className="absolute h-[125px] left-[48px] top-[154px] w-[74px]">
      <Group2 />
    </div>
  );
}

function Frame11() {
  return (
    <div className="absolute left-[28px] size-[28px] top-[62px]">
      <div className="absolute left-0 size-[28px] top-[4px]">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 28 28">
          <circle cx="14" cy="14" fill="var(--fill-0, #363F2C)" id="Ellipse 78" r="14" />
        </svg>
      </div>
      <p className="-translate-x-1/2 [word-break:break-word] absolute font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] left-1/2 text-[16px] text-center text-shadow-[0px_0px_13px_rgba(0,0,0,0.25)] text-white top-[calc(50%-8px)] whitespace-nowrap">3</p>
    </div>
  );
}

function Group1() {
  return (
    <div className="absolute contents left-[5px] top-0">
      <div className="absolute left-[5px] size-[74px] top-0">
        <div className="absolute inset-[-4.05%]">
          <img alt="" className="block max-w-none size-full" height="80" src={imgEllipse64} width="80" />
        </div>
      </div>
      <Frame11 />
    </div>
  );
}

function Frame7() {
  return (
    <div className="absolute h-[125px] left-[254px] top-[154px] w-[74px]">
      <Group1 />
    </div>
  );
}

function Frame() {
  return (
    <div className="content-stretch flex gap-[2px] items-center relative shrink-0">
      <div className="overflow-clip relative shrink-0 size-[12px]" data-name="Icon/Menu/Workout">
        <div className="absolute inset-[0.15%_-0.02%_0_0]" data-name="Vector">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.0026 11.9815">
            <path d={svgPaths.pfd63880} fill="var(--fill-0, #C7F064)" id="Vector" />
          </svg>
        </div>
      </div>
      <p className="[word-break:break-word] font-['Plus_Jakarta_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[13px] text-center text-white whitespace-nowrap">43 pts</p>
    </div>
  );
}

function Frame5() {
  return (
    <div className="-translate-x-1/2 absolute content-stretch flex flex-col gap-[2px] items-center left-[calc(50%+0.5px)] top-[230px] w-[110px]">
      <p className="[word-break:break-word] font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[14.4px] text-center text-white w-[110px]">Bryan Wolf</p>
      <Frame />
    </div>
  );
}

function Frame1() {
  return (
    <div className="content-stretch flex gap-[2px] items-center relative shrink-0">
      <div className="overflow-clip relative shrink-0 size-[12px]" data-name="Icon/Menu/Workout">
        <div className="absolute inset-[0.15%_-0.02%_0_0]" data-name="Vector">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.0026 11.9815">
            <path d={svgPaths.pfd63880} fill="var(--fill-0, #C7F064)" id="Vector" />
          </svg>
        </div>
      </div>
      <p className="[word-break:break-word] font-['Plus_Jakarta_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[13px] text-center text-white whitespace-nowrap">40 pts</p>
    </div>
  );
}

function Frame3() {
  return (
    <div className="-translate-x-1/2 absolute content-stretch flex flex-col gap-[2px] items-center left-[calc(50%-108.5px)] top-[250px] w-[110px]">
      <p className="[word-break:break-word] font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[14.4px] text-center text-white w-[109px]">Meghan Jes...</p>
      <Frame1 />
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex gap-[2px] items-center relative shrink-0">
      <div className="overflow-clip relative shrink-0 size-[12px]" data-name="Icon/Menu/Workout">
        <div className="absolute inset-[0.15%_-0.02%_0_0]" data-name="Vector">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 12.0026 11.9815">
            <path d={svgPaths.pfd63880} fill="var(--fill-0, #C7F064)" id="Vector" />
          </svg>
        </div>
      </div>
      <p className="[word-break:break-word] font-['Plus_Jakarta_Sans:Regular',sans-serif] font-normal leading-[1.5] relative shrink-0 text-[13px] text-center text-white whitespace-nowrap">38 pts</p>
    </div>
  );
}

function Frame4() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[2px] items-center left-[241px] top-[250px] w-[110px]">
      <p className="[word-break:break-word] font-['Plus_Jakarta_Sans:Bold',sans-serif] font-bold leading-[1.5] relative shrink-0 text-[14.4px] text-center text-white w-[94px]">Alex Turner</p>
      <Frame2 />
    </div>
  );
}

function Crown() {
  return (
    <div className="absolute left-[171px] size-[32px] top-[101px]" data-name="crown 1">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 32 32">
        <g clipPath="url(#clip0_5_729)" id="crown 1">
          <path d={svgPaths.p3808280} fill="var(--fill-0, #C7F064)" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_5_729">
            <rect fill="white" height="32" width="32" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

export default function Workout() {
  return (
    <div className="bg-[#252728] relative size-full" data-name="Workout">
      <StatusBarIPhone13Mini />
      <Header />
      <div className="absolute bg-[#0a0814] h-[494px] left-0 rounded-tl-[32px] rounded-tr-[32px] top-[318px] w-[375px]" />
      <AutoLayoutVertical />
      <Frame8 />
      <Frame6 />
      <Frame7 />
      <Frame5 />
      <Frame3 />
      <Frame4 />
      <Crown />
    </div>
  );
}