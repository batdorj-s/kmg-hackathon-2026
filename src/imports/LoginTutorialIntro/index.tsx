import imgBookAndGlobe1 from "./b49f879a8211f30db1da526b03d132486e78225d.png";
import imgEducationBook1 from "./14bdf446a74a5dc8d13391e26eec91951907e4b5.png";
import imgBookStacks1 from "./3bc4e5a0f65104c7f785952400d84abe5b641f53.png";
import imgCoins1 from "./564ca2885af5bc3b80afa951da2d58c842e8df30.png";

export default function LoginTutorialIntro() {
  return (
    <div className="bg-[#272052] relative size-full" data-name="Login / Tutorial intro">
      <div className="absolute left-[-24px] size-[542px] top-[-58px]">
        <div className="absolute inset-[-92.25%]">
          <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 1542 1542">
            <g filter="url(#filter0_f_1_411)" id="Ellipse 139">
              <circle cx="771" cy="771" fill="var(--fill-0, #AF7EE7)" r="271" />
            </g>
            <defs>
              <filter colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" height="1542" id="filter0_f_1_411" width="1542" x="0" y="0">
                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                <feBlend in="SourceGraphic" in2="BackgroundImageFix" mode="normal" result="shape" />
                <feGaussianBlur result="effect1_foregroundBlur_1_411" stdDeviation="250" />
              </filter>
            </defs>
          </svg>
        </div>
      </div>
      <div className="[word-break:break-word] absolute font-['Gilroy-Medium:☞',sans-serif] leading-[0] left-[20px] not-italic text-[0px] text-white top-[536px] tracking-[0.4px] whitespace-nowrap">
        <p className="leading-[101%] mb-0 text-[32px]">Welcome</p>
        <p className="text-[32px]">
          <span className="leading-[101%]">{`to `}</span>
          <span className="[word-break:break-word] font-['Gilroy-Bold:☞',sans-serif] leading-[101%] not-italic tracking-[0.4px]">{`FunQuiz `}</span>
          <span className="leading-[101%]">Academy!</span>
        </p>
      </div>
      <div className="[word-break:break-word] absolute font-['Gilroy-Regular:☞',sans-serif] leading-[0] left-[20px] not-italic text-[16px] text-white top-[631px] whitespace-nowrap">
        <p className="leading-[24px] mb-0">Play, Learn, and Explore with Exciting</p>
        <p className="leading-[24px]">Quizzes!</p>
      </div>
      <div className="absolute bg-[#d8d5ea] h-[60px] left-[20px] rounded-[100px] top-[713px] w-[335px]" />
      <div className="-translate-x-1/2 absolute left-[calc(50%+0.5px)] size-[426px] top-[79px]" data-name="Book and Globe 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgBookAndGlobe1} />
      </div>
      <div className="absolute left-[-80px] size-[224px] top-[-18px]" data-name="Education Book 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgEducationBook1} />
      </div>
      <div className="absolute blur-[2px] left-[calc(62.5%-4.38px)] size-[116px] top-[439px]" data-name="Book Stacks 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgBookStacks1} />
      </div>
      <div className="absolute bg-white h-[60px] left-[20px] rounded-[100px] top-[706px] w-[335px]" />
      <p className="[word-break:break-word] absolute font-['Gilroy-Bold:☞',sans-serif] leading-[24px] left-[calc(25%+41.25px)] not-italic text-[#2e2e2e] text-[16px] top-[725px] tracking-[0.4px] whitespace-nowrap">GET STARTED</p>
      <div className="absolute left-[calc(62.5%+32.63px)] size-[123px] top-[-18px]" data-name="coins 1">
        <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgCoins1} />
      </div>
      <div className="absolute flex items-center justify-center left-[calc(37.5%+13.38px)] size-[53px] top-[52px]">
        <div className="-scale-y-100 flex-none rotate-180">
          <div className="relative size-[53px]" data-name="coins 2">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgCoins1} />
          </div>
        </div>
      </div>
      <div className="absolute flex items-center justify-center left-[41px] size-[54.58px] top-[439px]">
        <div className="-scale-y-100 flex-none rotate-[159.19deg]">
          <div className="relative size-[42.308px]" data-name="coins 4">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgCoins1} />
          </div>
        </div>
      </div>
      <div className="absolute flex items-center justify-center left-[calc(75%+5.32px)] size-[48.86px] top-[206.57px]">
        <div className="flex-none rotate-[28.68deg]">
          <div className="relative size-[36px]" data-name="coins 3">
            <img alt="" className="absolute inset-0 max-w-none object-cover pointer-events-none size-full" src={imgCoins1} />
          </div>
        </div>
      </div>
    </div>
  );
}