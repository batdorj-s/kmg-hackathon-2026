import svgPaths from "./svg-qi2jzpczo0";
type ShopProps = {
  className?: string;
  property1?: "bold" | "linear";
};

function Shop({ className, property1 = "bold" }: ShopProps) {
  return (
    <div className={className || "relative size-[24px]"}>
      {property1 === "bold" && (
        <div className="absolute contents inset-0" data-name="vuesax/bold/shop">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
            <g id="shop">
              <path d={svgPaths.p2db54800} fill="var(--fill-0, #9DB2CE)" id="Vector" />
              <path d={svgPaths.p32233a80} fill="var(--fill-0, #9DB2CE)" id="Vector_2" />
              <path d={svgPaths.p29ec6580} fill="var(--fill-0, #9DB2CE)" id="Vector_3" />
              <g id="Vector_4" opacity="0" />
            </g>
          </svg>
        </div>
      )}
      {property1 === "linear" && (
        <div className="absolute contents inset-0" data-name="vuesax/linear/shop">
          <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
            <g id="shop">
              <path d={svgPaths.p20801f40} id="Vector" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              <path d={svgPaths.pc98c700} id="Vector_2" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              <path d={svgPaths.p21cdf700} id="Vector_3" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              <path d={svgPaths.p1054e470} id="Vector_4" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              <path d={svgPaths.p31026300} id="Vector_5" stroke="var(--stroke-0, white)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              <g id="Vector_6" opacity="0" />
            </g>
          </svg>
        </div>
      )}
    </div>
  );
}

export default function StatusHomeModeLight({ className }: { className?: string }) {
  return (
    <div className={className || "h-[95px] relative w-[428px]"} data-name="Status=Home, Mode=Light">
      <div className="absolute inset-[11px_0_0_0]" data-name="Vector">
        <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 428 84">
          <path d={svgPaths.p1308dc00} fill="var(--fill-0, white)" id="Vector" />
        </svg>
      </div>
      <div className="-translate-x-1/2 absolute bg-[#613eea] content-stretch drop-shadow-[0px_4px_6px_rgba(97,62,234,0.5)] flex flex-col items-center left-1/2 p-[15px] rounded-[50px] top-0" data-name="float-btn">
        <Shop className="relative shrink-0 size-[24px]" property1="linear" />
      </div>
      <div className="absolute content-stretch flex h-[75px] items-center justify-between left-0 px-[16px] right-0 rounded-[12px] top-[20px]" data-name="menu">
        <div className="content-stretch flex gap-[10px] items-start relative shrink-0" data-name="navigation/menu - left">
          <div className="content-stretch flex flex-col gap-[12px] items-center px-[15px] py-[12.5px] relative shrink-0" data-name="navigation/menu - home">
            <div className="relative shrink-0 size-[24px]" data-name="home">
              <div className="absolute contents inset-0" data-name="vuesax/bold/home-2">
                <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                  <g id="home-2">
                    <path d={svgPaths.p37a1e000} fill="var(--fill-0, #386BF6)" id="Vector" />
                    <g id="Vector_2" opacity="0" />
                  </g>
                </svg>
              </div>
            </div>
            <p className="[word-break:break-word] font-['SF_Pro_Text:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#386bf6] text-[12px] whitespace-nowrap">Home</p>
          </div>
          <div className="content-stretch flex flex-col gap-[5px] items-center px-[15px] py-[16px] relative shrink-0" data-name="navigation/menu - home">
            <div className="relative shrink-0 size-[24px]" data-name="search">
              <div className="absolute contents inset-0" data-name="vuesax/linear/search-normal">
                <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                  <g id="search-normal">
                    <path d={svgPaths.p6857980} id="Vector" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    <path d="M22 22L20 20" id="Vector_2" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    <path d="M23.5 0.5V23.5H0.5V0.5H23.5Z" id="Vector_3" opacity="0" stroke="var(--stroke-0, #9DB2CE)" />
                  </g>
                </svg>
              </div>
            </div>
            <p className="[word-break:break-word] font-['SF_Pro_Text:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#9db2ce] text-[12px] whitespace-nowrap">Search</p>
          </div>
        </div>
        <div className="content-stretch flex gap-[10px] items-start relative shrink-0" data-name="navigation/menu - right">
          <div className="content-stretch flex flex-col gap-[5px] items-center px-[15px] py-[16px] relative shrink-0" data-name="navigation/menu - home">
            <div className="relative shrink-0 size-[24px]" data-name="cart">
              <div className="absolute contents inset-0" data-name="vuesax/linear/bag">
                <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                  <g id="bag">
                    <path d="M8.81 2L5.19 5.63" id="Vector" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
                    <path d="M15.19 2L18.81 5.63" id="Vector_2" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth="1.5" />
                    <path d={svgPaths.p298cd600} id="Vector_3" stroke="var(--stroke-0, #9DB2CE)" strokeWidth="1.5" />
                    <g id="Vector_4">
                      <path d="M9.76 14V17.55Z" fill="var(--fill-0, #9DB2CE)" />
                      <path d="M9.76 14V17.55" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeWidth="1.5" />
                    </g>
                    <path d="M14.36 14V17.55" id="Vector_5" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeWidth="1.5" />
                    <path d={svgPaths.p3216aa00} id="Vector_6" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeWidth="1.5" />
                    <g id="Vector_7" opacity="0" />
                  </g>
                </svg>
              </div>
            </div>
            <p className="[word-break:break-word] font-['SF_Pro_Text:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#9db2ce] text-[12px] text-center w-[47px]">Cart</p>
          </div>
          <div className="content-stretch flex flex-col gap-[5px] items-center px-[15px] py-[16px] relative shrink-0" data-name="navigation/menu - home">
            <div className="relative shrink-0 size-[24px]" data-name="user">
              <div className="absolute contents inset-0" data-name="vuesax/linear/user">
                <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 24 24">
                  <g id="user">
                    <path d={svgPaths.pae7b400} id="Vector" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    <path d={svgPaths.p1b59ca60} id="Vector_2" stroke="var(--stroke-0, #9DB2CE)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    <g id="Vector_3" opacity="0" />
                  </g>
                </svg>
              </div>
            </div>
            <p className="[word-break:break-word] font-['SF_Pro_Text:Regular',sans-serif] leading-[normal] not-italic relative shrink-0 text-[#9db2ce] text-[12px] whitespace-nowrap">Profile</p>
          </div>
        </div>
      </div>
    </div>
  );
}