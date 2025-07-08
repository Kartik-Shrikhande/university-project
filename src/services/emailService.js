const nodemailer = require("nodemailer");
const student = require("../models/studentsModel");
const crypto = require("crypto");
require("dotenv").config({ path: ".env" });
const fs = require('fs');
const path = require('path');
const logoPath = path.join(__dirname, '../images/logo.svg');
const logoimage = fs.readFileSync(logoPath, 'utf8');
const mongoose = require("mongoose");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Company SVG Logo
// const COMPANY_LOGO = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="76" viewBox="0 0 120 76" fill="none">
//   <g clip-path="url(#clip0_6055_37477)">
//     <mask id="mask0_6055_37477" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="44" y="13" width="39" height="48">
//       <path d="M82.1393 13.7188H44.1344V60.6937H82.1393V13.7188Z" fill="white"/>
//     </mask>
//     <g mask="url(#mask0_6055_37477)">
//       <path fill-rule="evenodd" clip-rule="evenodd" d="M82.1393 60.2014C82.1393 60.3439 82.0775 60.4808 81.9698 60.5808C81.8621 60.6807 81.7145 60.7381 81.5609 60.7381H44.7089C44.5553 60.7381 44.4077 60.6807 44.3 60.5808C44.1923 60.4808 44.1305 60.3439 44.1305 60.2014V59.1595C44.1305 59.017 44.1923 58.8801 44.3 58.7802C44.4077 58.6802 44.5553 58.6229 44.7089 58.6229H49.2563C50.5368 58.6229 51.179 58.0288 51.179 56.8408V17.6161C51.179 16.428 50.5388 15.8321 49.2563 15.8321H44.7089C44.5553 15.8321 44.4077 15.7766 44.3 15.6767C44.1923 15.5767 44.1305 15.4398 44.1305 15.2973V14.2536C44.1305 14.1111 44.1923 13.9741 44.3 13.8742C44.4077 13.7743 44.5553 13.7188 44.7089 13.7188H81.5609C81.7145 13.7188 81.8621 13.7743 81.9698 13.8742C82.0775 13.9741 82.1393 14.1111 82.1393 14.2536V15.2973C82.1393 15.4398 82.0775 15.5767 81.9698 15.6767C81.8621 15.7766 81.7145 15.8321 81.5609 15.8321H77.0135C75.7311 15.8321 75.0908 16.4261 75.0908 17.6161V56.8426C75.0908 58.0307 75.7311 58.6247 77.0135 58.6247H81.5609C81.7145 58.6247 81.8621 58.6821 81.9698 58.782C82.0775 58.8819 82.1393 59.0189 82.1393 59.1614V60.2033V60.2014ZM66.6243 15.8321H59.6496C58.3691 15.8321 57.7269 16.4261 57.7269 17.6161V56.8426C57.7269 58.0307 58.3671 58.6247 59.6496 58.6247H66.6243C67.9047 58.6247 68.5469 58.0307 68.5469 56.8426V17.6161C68.5469 16.428 67.9067 15.8321 66.6243 15.8321Z" fill="#005B1A"/>
//     </g>
//     <mask id="mask1_6055_37477" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="44" y="0" width="39" height="8">
//       <path d="M82.1986 0.388672H44.0262V7.40419H82.1986V0.388672Z" fill="white"/>
//     </mask>
//     <g mask="url(#mask1_6055_37477)">
//       <path d="M81.5213 28.9303H80.7036V26.8151C80.7036 26.7318 80.6856 26.6522 80.6517 26.5745C80.6178 26.4968 80.568 26.4302 80.5061 26.371C80.4443 26.3117 80.3705 26.2673 80.2867 26.2359C80.203 26.2044 80.1172 26.1877 80.0274 26.1877H79.108V13.9259C79.1838 13.9111 79.2536 13.887 79.3194 13.85C79.3852 13.8148 79.4411 13.7686 79.4909 13.7149C79.5408 13.6612 79.5787 13.6002 79.6066 13.5354C79.6345 13.4688 79.6485 13.4003 79.6505 13.33V11.3591H80.6717C80.7614 11.3591 80.8492 11.3425 80.9309 11.311C81.0147 11.2795 81.0885 11.2333 81.1503 11.1759C81.2122 11.1185 81.262 11.0501 81.2959 10.9723C81.3298 10.8946 81.3478 10.815 81.3478 10.7318V8.30937C81.3478 8.2261 81.3318 8.14467 81.2959 8.0688C81.262 7.99292 81.2122 7.92445 81.1503 7.86524C81.0885 7.80602 81.0127 7.7616 80.9309 7.73014C80.8492 7.69868 80.7634 7.68203 80.6717 7.68203H80.0354L77.2232 4.60638C77.1434 4.512 77.0417 4.45093 76.918 4.41762L62.849 0.446293C62.7213 0.411132 62.5957 0.411132 62.47 0.446293L48.03 4.60638C47.8983 4.64154 47.7906 4.70816 47.7049 4.80809L45.2696 7.70053H44.6473C44.5576 7.70053 44.4698 7.71719 44.388 7.74865C44.3043 7.78011 44.2325 7.82637 44.1687 7.88374C44.1048 7.94296 44.057 8.00958 44.0231 8.0873C43.9892 8.16503 43.9712 8.2446 43.9712 8.32788V10.7688C43.9712 10.8521 43.9872 10.9316 44.0231 11.0094C44.059 11.0871 44.1068 11.1537 44.1687 11.2129C44.2325 11.2721 44.3063 11.3166 44.388 11.348C44.4698 11.3795 44.5556 11.3961 44.6473 11.3961H45.6745V13.367C45.6785 13.4392 45.6924 13.5076 45.7204 13.5724C45.7483 13.6372 45.7862 13.7001 45.836 13.7538C45.8859 13.8074 45.9437 13.8537 46.0096 13.8888C46.0754 13.924 46.1472 13.9499 46.223 13.9629V26.2118H45.2696C45.1799 26.2118 45.0921 26.2285 45.0103 26.2599C44.9266 26.2914 44.8528 26.3376 44.7909 26.395C44.7291 26.4524 44.6792 26.5209 44.6453 26.5986C44.6114 26.6763 44.5935 26.7559 44.5935 26.8391V28.9544H43.6461C43.5563 28.9544 43.4706 28.971 43.3868 29.0025C43.303 29.0339 43.2312 29.0802 43.1674 29.1376C43.1036 29.1949 43.0557 29.2652 43.0218 29.3411C42.9879 29.4188 42.97 29.4984 42.97 29.5817V31.6081C42.97 31.6913 42.9879 31.7728 43.0218 31.8486C43.0557 31.9245 43.1056 31.993 43.1674 32.0522C43.2293 32.1114 43.303 32.1558 43.3868 32.1873C43.4706 32.2188 43.5563 32.2354 43.6461 32.2354H81.5213C81.6111 32.2354 81.6968 32.2206 81.7806 32.1873C81.8624 32.1558 81.9362 32.1096 82 32.0522C82.0638 31.9948 82.1117 31.9245 82.1456 31.8486C82.1795 31.7709 82.1974 31.6913 82.1974 31.6081V29.5373C82.1935 29.4559 82.1755 29.3781 82.1396 29.3023C82.1037 29.2264 82.0538 29.1616 81.992 29.1042C81.9302 29.0469 81.8564 29.0043 81.7746 28.9729C81.6928 28.9414 81.6091 28.9266 81.5213 28.9266V28.9303ZM48.5366 26.2137H47.5234V13.9407H48.5366V26.2137ZM55.976 26.2137H55.0306C54.9409 26.2137 54.8531 26.2303 54.7713 26.2618C54.6896 26.2932 54.6158 26.3395 54.5519 26.3969C54.4881 26.4542 54.4402 26.5227 54.4063 26.6004C54.3724 26.6781 54.3545 26.7577 54.3545 26.841V28.9562H51.4465V26.8169C51.4465 26.7337 51.4286 26.6541 51.3947 26.5764C51.3608 26.4986 51.3109 26.432 51.2491 26.3728C51.1872 26.3136 51.1134 26.2692 51.0297 26.2377C50.9459 26.2063 50.8601 26.1896 50.7704 26.1896H49.8509V13.9277C49.9267 13.9129 49.9965 13.8888 50.0623 13.8518C50.1282 13.8167 50.184 13.7704 50.2339 13.7167C50.2817 13.6631 50.3216 13.602 50.3476 13.5372C50.3755 13.4706 50.3894 13.4021 50.3914 13.3318V11.361H55.4235V13.3318C55.4275 13.404 55.4415 13.4725 55.4694 13.5372C55.4973 13.6039 55.5352 13.6649 55.5851 13.7186C55.6349 13.7723 55.6928 13.8185 55.7606 13.8537C55.8284 13.8888 55.8982 13.9148 55.974 13.9277L55.98 26.2137H55.976ZM58.2956 26.2137H57.2824V13.9407H58.2956V26.2137ZM65.735 26.2137H64.7876C64.6979 26.2137 64.6121 26.2303 64.5283 26.2618C64.4446 26.2932 64.3728 26.3395 64.3089 26.3969C64.2451 26.4542 64.1972 26.5227 64.1633 26.6004C64.1294 26.6781 64.1115 26.7577 64.1115 26.841V28.9562H61.2314V26.8169C61.2314 26.7337 61.2135 26.6541 61.1796 26.5764C61.1457 26.4986 61.0958 26.432 61.034 26.3728C60.9722 26.3136 60.8984 26.2692 60.8146 26.2377C60.7308 26.2063 60.6451 26.1896 60.5553 26.1896H59.602V13.9277C59.6777 13.9129 59.7456 13.8888 59.8114 13.8518C59.8772 13.8167 59.935 13.7704 59.9829 13.7167C60.0308 13.6631 60.0707 13.602 60.0966 13.5372C60.1245 13.4706 60.1385 13.4021 60.1405 13.3318V11.361H65.1706V13.3318C65.1745 13.404 65.1885 13.4725 65.2164 13.5372C65.2443 13.602 65.2822 13.6649 65.3321 13.7186C65.382 13.7723 65.4398 13.8185 65.5056 13.8537C65.5714 13.8888 65.6432 13.9148 65.719 13.9277L65.733 26.2137H65.735ZM68.0546 26.2137H67.0394V13.9407H68.0546V26.2137ZM75.494 26.2137H74.5466C74.4569 26.2137 74.3711 26.2303 74.2873 26.2618C74.2036 26.2932 74.1318 26.3395 74.0679 26.3969C74.0041 26.4542 73.9562 26.5227 73.9223 26.6004C73.8884 26.6781 73.8705 26.7577 73.8705 26.841V28.9562H70.9486V26.8169C70.9486 26.7337 70.9326 26.6541 70.8967 26.5764C70.8608 26.4986 70.8129 26.432 70.7511 26.3728C70.6893 26.3136 70.6135 26.2692 70.5317 26.2377C70.448 26.2063 70.3622 26.1896 70.2724 26.1896H69.345V13.9277C69.4208 13.9129 69.4906 13.8888 69.5564 13.8518C69.6222 13.8167 69.6781 13.7704 69.7279 13.7167C69.7758 13.6631 69.8157 13.602 69.8416 13.5372C69.8696 13.4706 69.8835 13.4021 69.8855 13.3318V11.361H74.9176V13.3318C74.9216 13.404 74.9355 13.4725 74.9635 13.5372C74.9914 13.6039 75.0293 13.6649 75.0791 13.7186C75.129 13.7723 75.1868 13.8185 75.2547 13.8537C75.3225 13.8888 75.3923 13.9148 75.4681 13.9277L75.496 26.2137H75.494ZM77.8136 26.2137H76.7844V13.9407H77.7996L77.8136 26.2137ZM75.5817 10.1433H45.3035V8.8886H80.0195V10.1433H75.5837H75.5817Z" fill="#005B1A"/>
//     </g>
//     <path d="M44.1044 10.6719H82.173" stroke="#005B1A" stroke-width="0.352235" stroke-miterlimit="8.06"/>
//     <path d="M0 37.194C0 32.5361 1.13087 28.3483 3.39461 24.6286C5.65635 20.9071 8.74381 17.9962 12.657 15.8958C16.5682 13.7972 20.9101 12.7461 25.6829 12.7461C31.2934 12.7461 36.1879 14.0026 40.3683 16.512C44.5507 19.0232 47.6023 22.5837 49.523 27.1954H41.4792C40.0512 24.3196 37.9989 22.1044 35.3163 20.5518C32.6337 18.9992 29.4246 18.2238 25.6849 18.2238C21.9453 18.2238 18.8678 19.001 16.0157 20.5518C13.1616 22.1044 10.9238 24.3066 9.30027 27.1602C7.67676 30.0138 6.86501 33.3578 6.86501 37.1921C6.86501 41.0265 7.67676 44.3039 9.30027 47.1575C10.9238 50.0111 13.1616 52.2132 16.0157 53.7659C18.8678 55.3166 22.0909 56.0902 25.6849 56.0902C29.279 56.0902 32.6337 55.3259 35.3163 53.7955C37.9969 52.2669 40.0512 50.0629 41.4792 47.1871H49.523C47.6023 51.7543 44.5507 55.2815 40.3683 57.7705C36.1879 60.2595 31.2934 61.5031 25.6829 61.5031C20.9101 61.5031 16.5682 60.4649 12.657 58.3886C8.7458 56.3104 5.65835 53.4217 3.39461 49.7261C1.13087 46.0286 0 41.85 0 37.194Z" fill="#004AAD"/>
//     <path d="M87.9702 13.7188V43.6925C87.9702 47.9081 89.0891 51.0337 91.3269 53.0712C93.5667 55.1105 96.6801 56.1283 100.667 56.1283C104.654 56.1283 107.69 55.1086 109.929 53.0712C112.167 51.0337 113.286 47.9081 113.286 43.6925V13.7188H120.002V43.624C120.002 47.5657 119.14 50.8856 117.417 53.5801C115.695 56.2763 113.372 58.2824 110.444 59.5963C107.516 60.9102 104.231 61.5671 100.591 61.5671C96.9513 61.5671 93.6624 60.9102 90.7345 59.5963C87.8086 58.2824 85.497 56.2782 83.7997 53.5801C82.1004 50.8838 81.2527 47.5639 81.2527 43.624V13.7188H87.9682H87.9702Z" fill="#004AAD"/>
//     <mask id="mask2_6055_37477" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="8" y="64" width="106" height="1">
//       <path d="M113.734 64.0195H8.46149V64.3934H113.734V64.0195Z" fill="white"/>
//     </mask>
//     <g mask="url(#mask2_6055_37477)">
//       <path d="M8.46149 64.043H113.91V64.4927H8.46149V64.043Z" fill="black"/>
//     </g>
//     <path d="M10.7059 71.5936C10.7059 70.82 10.8934 70.1279 11.2704 69.5154C11.6473 68.9047 12.1599 68.4272 12.8121 68.0849C13.4623 67.7444 14.1943 67.5723 15.006 67.5723C15.9534 67.5723 16.7831 67.798 17.4952 68.2514C18.2072 68.7011 18.7038 69.3248 18.987 70.1205H17.0344C16.841 69.743 16.5657 69.4598 16.2107 69.2729C15.8577 69.086 15.4528 68.9917 14.9941 68.9917C14.4974 68.9917 14.0567 69.099 13.6717 69.3155C13.2888 69.5302 12.9896 69.8318 12.7742 70.2223C12.5608 70.6128 12.4551 71.0698 12.4551 71.5954C12.4551 72.121 12.5608 72.5725 12.7742 72.9685C12.9896 73.3627 13.2888 73.6662 13.6717 73.879C14.0567 74.0937 14.4974 74.1992 14.9941 74.1992C15.4528 74.1992 15.8597 74.1048 16.2107 73.9142C16.5657 73.7217 16.839 73.4386 17.0344 73.0629H18.987C18.7038 73.8679 18.2072 74.4934 17.4991 74.9412C16.7891 75.3891 15.9594 75.613 15.006 75.613C14.1943 75.613 13.4623 75.4427 12.8121 75.1004C12.1599 74.7599 11.6473 74.2824 11.2704 73.6736C10.8934 73.0648 10.7059 72.3726 10.7059 71.5991V71.5936Z" fill="#004AAD"/>
//     <path d="M25.8352 75.6103C25.0433 75.6103 24.3134 75.4382 23.6492 75.094C22.987 74.7498 22.4605 74.2724 22.0696 73.6598C21.6806 73.0454 21.4872 72.3515 21.4872 71.5779C21.4872 70.8044 21.6806 70.1234 22.0696 69.5108C22.4605 68.9002 22.985 68.4209 23.6492 68.0767C24.3134 67.7287 25.0414 67.5566 25.8352 67.5566C26.629 67.5566 27.3689 67.7306 28.0291 68.0767C28.6873 68.4209 29.2098 68.9002 29.5908 69.5108C29.9757 70.1234 30.1692 70.8118 30.1692 71.5779C30.1692 72.3441 29.9757 73.0454 29.5908 73.6598C29.2078 74.2724 28.6853 74.7498 28.0191 75.094C27.3569 75.4382 26.629 75.6103 25.8332 75.6103H25.8352ZM25.8352 74.2039C26.3437 74.2039 26.7925 74.0984 27.1814 73.8837C27.5723 73.6709 27.8755 73.3656 28.0949 72.9659C28.3123 72.568 28.424 72.1053 28.424 71.5779C28.424 71.0505 28.3143 70.5953 28.0949 70.2011C27.8755 69.8051 27.5704 69.5016 27.1814 69.2906C26.7925 69.0797 26.3437 68.9742 25.8352 68.9742C25.3266 68.9742 24.8738 69.0797 24.4809 69.2906C24.09 69.5016 23.7848 69.8051 23.5674 70.2011C23.348 70.5953 23.2383 71.0524 23.2383 71.5779C23.2383 72.1035 23.348 72.568 23.5674 72.9659C23.7848 73.3656 24.092 73.6709 24.4809 73.8837C24.8738 74.0984 25.3246 74.2039 25.8352 74.2039Z" fill="#004AAD"/>
//     <path d="M40.1338 75.5305H38.4345L34.5871 70.1324V75.5305H32.8878V67.6582H34.5871L38.4345 73.0637V67.6582H40.1338V75.5305Z" fill="#004AAD"/>
//     <path d="M50.5216 75.5305H48.8224L44.975 70.1324V75.5305H43.2757V67.6582H44.975L48.8224 73.0637V67.6582H50.5216V75.5305Z" fill="#004AAD"/>
//     <path d="M55.3461 68.9406V70.9115H58.1962V72.1606H55.3461V74.2462H58.5632V75.5305H53.6468V67.6582H58.5632V68.9425H55.3461V68.9406Z" fill="#004AAD"/>
//     <path d="M61.1468 71.5936C61.1468 70.82 61.3343 70.1279 61.7112 69.5154C62.0882 68.9047 62.6008 68.4272 63.253 68.0849C63.9032 67.7444 64.6351 67.5723 65.4469 67.5723C66.3943 67.5723 67.224 67.798 67.936 68.2514C68.648 68.7011 69.1447 69.3248 69.4279 70.1205H67.4753C67.2818 69.743 67.0066 69.4598 66.6516 69.2729C66.2985 69.086 65.8937 68.9917 65.4349 68.9917C64.9383 68.9917 64.4975 69.099 64.1126 69.3155C63.7296 69.5302 63.4305 69.8318 63.2151 70.2223C63.0017 70.6128 62.896 71.0698 62.896 71.5954C62.896 72.121 63.0017 72.5725 63.2151 72.9685C63.4305 73.3627 63.7296 73.6662 64.1126 73.879C64.4975 74.0937 64.9383 74.1992 65.4349 74.1992C65.8937 74.1992 66.3005 74.1048 66.6516 73.9142C67.0066 73.7217 67.2798 73.4386 67.4753 73.0629H69.4279C69.1447 73.8679 68.648 74.4934 67.94 74.9412C67.23 75.3891 66.4003 75.613 65.4469 75.613C64.6351 75.613 63.9032 75.4427 63.253 75.1004C62.6008 74.7599 62.0882 74.2824 61.7112 73.6736C61.3343 73.0648 61.1468 72.3726 61.1468 71.5991V71.5936Z" fill="#004AAD"/>
//     <path d="M78.1177 67.666V68.9429H75.8579V75.5309H74.1587V68.9429H71.9029V67.666H78.1197H78.1177Z" fill="#004AAD"/>
//     <path d="M81.15 73.7548C81.9279 73.157 82.5482 72.6555 83.0069 72.2558C83.4696 71.8524 83.8546 71.4342 84.1617 70.9993C84.4689 70.5625 84.6224 70.1332 84.6224 69.7113C84.6224 69.3282 84.5247 69.0284 84.3312 68.8137C84.1378 68.5954 83.8386 68.4862 83.4337 68.4862C83.0288 68.4862 82.7177 68.612 82.4983 68.8637C82.2789 69.1154 82.1652 69.4596 82.1572 69.8926H80.5078C80.5377 68.9895 80.8249 68.3067 81.3714 67.8422C81.9199 67.3777 82.614 67.1445 83.4577 67.1445C84.3811 67.1445 85.0871 67.3722 85.5818 67.8274C86.0744 68.2826 86.3217 68.8822 86.3217 69.6243C86.3217 70.2109 86.1522 70.7716 85.8111 71.3046C85.4721 71.8376 85.0852 72.3021 84.6484 72.6962C84.2096 73.0904 83.6391 73.5642 82.9371 74.1193H86.5192V75.4258H80.5198V74.2544L81.152 73.7566L81.15 73.7548Z" fill="#005B1A"/>
//     <path d="M90.9208 67.666V72.5349C90.9208 73.0678 91.0704 73.475 91.3696 73.7562C91.6687 74.0375 92.0896 74.1763 92.6321 74.1763C93.1746 74.1763 93.6094 74.0357 93.9085 73.7562C94.2077 73.4731 94.3573 73.066 94.3573 72.5349V67.666H96.0686V72.5238C96.0686 73.1918 95.911 73.7581 95.5999 74.2207C95.2887 74.6815 94.8719 75.0276 94.3493 75.2626C93.8288 75.4939 93.2484 75.6105 92.6081 75.6105C91.9679 75.6105 91.4035 75.4939 90.8869 75.2626C90.3743 75.0294 89.9694 74.6815 89.6703 74.2207C89.3711 73.7581 89.2215 73.1937 89.2215 72.5238V67.666H90.9208Z" fill="#004AAD"/>
//     <path d="M106.412 75.5305H104.712L100.865 70.1324V75.5305H99.1657V67.6582H100.865L104.712 73.0637V67.6582H106.412V75.5305Z" fill="#004AAD"/>
//     <path d="M111.245 67.666V75.5309H109.545V67.666H111.245Z" fill="#004AAD"/>
//   </g>
//   <defs>
//     <clipPath id="clip0_6055_37477">
//       <rect width="120" height="75.2239" fill="white" transform="translate(0 0.388672)"/>
//     </clipPath>
//   </defs>
// </svg>`;

// 📦 Enhanced Email Template Generator with Modern UI
// 📦 Enhanced Email Template Generator with Modern UI + Unsubscribe Option




const generateEmailTemplate = (
  title,
  color,
  contentHtml,
  actionButton = null,
  studentId = null
) => `
  <div style="max-width:600px;margin:20px auto;padding:0;font-family:'Segoe UI',Roboto,Oxygen,Ubuntu,Cantarell,'Open Sans','Helvetica Neue',sans-serif;background-color:#f9f9f9;">
    <div style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
      <!-- Header with Logo -->
      <div style="text-align:center;padding-top:20px;">
        <img src="${logoimage}">
        <h1 style="margin-top:25px;color:#004AAC;font-size:24px;font-weight:600;">${title}</h1>
      </div>
      
      <!-- Content Area -->
      <div style="padding:30px;">


        ${contentHtml}
        
        ${
          actionButton
            ? `
          <div style="margin:30px 0;text-align:center;">
            <a href="${actionButton.link}" 
               style="background-color:${color};color:#ffffff;padding:10px 40px;border-radius:5px;text-decoration:none;font-weight:400;display:inline-block;">
              ${actionButton.text}
            </a>
          </div>`
            : ""
        }

        <div style="margin-top:30px;padding-top:20px;border-top:1px solid #eeeeee;">
       

          
<p style="margin: 0;">Happy exploring!</p>
                    <p style="margin: 0;">— The Connect2Uni Team</p>

                    <p style="margin: 0;font-size:14px;line-height: normal;margin-top: 30px;">
                        If you didn’t request this email, you can safely ignore it.
                    </p>
                    <p style="margin: 0;font-size: 14px;margin-top: 7px;">
                        © ${new Date().getFullYear()} Connect2Uni. All rights reserved
                    </p>


          ${
            studentId
              ? `
            <p style="margin:5px 0;font-size:12px;text-align:center;">
              <a href="${process.env.SERVER_URL}/student/unsubscribe/${studentId}" style="color:#004AAC;text-decoration:underline;">
                Unsubscribe from reminders
              </a>
            </p>`
              : ""
          }
        </div>
      </div>
    </div>
  </div>
`;

// 📧 Send Verification Email
const sendVerificationEmail = async (student) => {
  const token = crypto.randomBytes(32).toString("hex");
  student.verificationToken = token;
  await student.save();

  const verificationLink = `${process.env.EMAIL_VERIFICATION_SERVER_LINK}/student/verify-email?token=${token}`;

  const html = generateEmailTemplate(
    "Verify Your Email",
    "#004AAC",
    `
                <div style="display: flex;gap: 5px;">
                    <span style="font-size:16px;font-weight: normal;">Hi </span><span style="font-size:16px;font-weight: bold;">${student.firstName}</span>
                </div>

                <div>
                    <p>
                 Welcome to Connect2Uni — your journey starts here! To finish setting up your account, just click the button below to verify your email:
                    </p>
                </div>

                 <div>
                    <p style="font-weight: 300;">
                        This link will expire in 24 hours, so don’t wait too long. If you didn’t sign up for Connect2Uni, feel free to ignore this email.
                    </p>
                </div>


`,
    // <p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
    //  <p style="font-size:16px;color:#555555;line-height:1.6;">Welcome to Connect2Uni! We're excited to have you on board. To complete your registration, please verify your email address by clicking the button below:</p>
    //  <p style="font-size:14px;color:#888888;text-align:center;margin:20px 0;">This link will expire in 24 hours</p>
    //

    {
      text: "Verify My Email",
      link: verificationLink,
    }
                 
  );








  await transporter.sendMail({
    from: `"Connect2Uni" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: "Let's Get You Started",
    html,
  });
};

// 📧 Send Application Rejection Email
const sendRejectionEmail = async (email, reason) => {
  const html = generateEmailTemplate(
    "Application Status Update",
    "#d9534f",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Dear Applicant,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">After careful consideration, we regret to inform you that your application has been <strong style="color:#d9534f;">not approved</strong> at this time.</p>
     <div style="background-color:#f8f9fa;border-left:4px solid #d9534f;padding:15px;border-radius:0 4px 4px 0;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#d9534f;">Feedback from our team:</h4>
       <p style="margin:0;color:#555555;">${reason}</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We appreciate the time and effort you put into your application and encourage you to apply again in the future.</p>`
  );

  await transporter.sendMail({
    from: `"Connect2Uni Admissions" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Application Status Update",
    html,
  });
};

// 📧 Send Payment Success Email
const sendPaymentSuccessEmail = async (student) => {
  const html = generateEmailTemplate(
    "Payment Confirmation",
    "#28a745",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${
      student.firstName
    }</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We've successfully processed your payment of <strong>20 GBP</strong>.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#28a745;">Payment Details</h4>
       <p style="margin:5px 0;color:#555555;"><strong>Amount:</strong> 20 GBP</p>
       <p style="margin:5px 0;color:#555555;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Status:</strong> <span style="color:#28a745;">Completed</span></p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">You now have full access to the student portal. If you have any questions about your payment, please contact our support team.</p>`,
    {
      text: "Access Student Portal",
      link: "https://yourwebsite.com/student-portal",
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Payments" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: "Payment Successful - Thank You!",
    html,
  });
};

// 📧 Solicitor Service Payment Email
const sendSolicitorPaymentEmail = async (student) => {
  const html = generateEmailTemplate(
    "Solicitor Service Confirmation",
    "#28a745",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Thank you for purchasing our solicitor service package. Your payment has been processed successfully.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#28a745;">Next Steps</h4>
       <p style="margin:5px 0;color:#555555;">1. Complete your solicitor service request form</p>
       <p style="margin:5px 0;color:#555555;">2. Our team will review your requirements</p>
       <p style="margin:5px 0;color:#555555;">3. A qualified solicitor will be assigned to your case</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">You can now apply for solicitor services through your student portal.</p>`,
    {
      text: "Request Solicitor Service",
      link: "https://yourwebsite.com/solicitor-services",
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Legal Services" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: "Solicitor Service Payment Confirmation",
    html,
  });
};

// 📧 Application Acceptance Email (with attachment link)

const sendAcceptanceEmail = async (email, courseName, universityName) => {
  const html = generateEmailTemplate(
    "Congratulations! 🎉",
    "#28a745",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Dear Student,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We are thrilled to inform you that your application for <strong>${courseName}</strong> at <strong>${universityName}</strong> has been <strong style="color:#28a745;">accepted</strong>!</p>
     <div style="background-color:#e8f5e9;border-radius:4px;padding:15px;margin:20px 0;text-align:center;">
       <p style="margin:0;font-size:18px;color:#28a745;">Welcome to Connect2Uni!</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">This is an exciting step in your academic journey, and we look forward to supporting you every step of the way.</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Your official acceptance letter will soon be sent to you by agency.</p>`
  );

  await transporter.sendMail({
    from: `"Connect2Uni Admissions" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Application Accepted - Congratulations!",
    html,
  });
};

// 📧 Notify Agency of Application Status
const sendAgencyNotificationEmail = async (
  email,
  studentName,
  studentId,
  status,
  courseName,
  universityName,
  uploadedFileUrl = null
) => {
  const color = status === "Rejected" ? "#d9534f" : "#28a745";
  const statusText = status === "Rejected" ? "not approved" : "approved";

  const fileLinkHtml = uploadedFileUrl
    ? `<p style="margin:5px 0;color:#555555;"><strong>Document:</strong> <a href="${uploadedFileUrl}" target="_blank" style="color:#007bff;">View Document</a></p>`
    : "";

  const html = generateEmailTemplate(
    `Student Application ${status}`,
    color,
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Dear Partner,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We would like to inform you about an update regarding one of your referred students.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:${color};">Application Status Update</h4>
       <p style="margin:5px 0;color:#555555;"><strong>Student Name:</strong> ${studentName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Student ID:</strong> ${studentId}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${courseName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${universityName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Status:</strong> <span style="color:${color};">${statusText}</span></p>
       ${fileLinkHtml}
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Please log in to your partner dashboard for more details about this application.</p>`,
    {
      text: "View in Dashboard",
      link: "https://yourwebsite.com/agency-portal",
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Partner Network" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Student Application Update: ${studentName}`,
    html,
  });
};

const sendOfferLetterEmailByAgency = async (
  email,
  studentName,
  courseName,
  universityName,
  fileUrl
) => {
  const html = generateEmailTemplate(
    "Your Official Acceptance Letter",
    "#28a745",
    `<p style="font-size:16px;color:#333333;">Hi <strong>${studentName}</strong>,</p>
     <p style="font-size:16px;color:#555555;">We are delighted to officially welcome you to <strong>${universityName}</strong> for the <strong>${courseName}</strong> program!</p>
     ${
       fileUrl
         ? `<p style="font-size:16px;color:#555555;">You can download your acceptance letter from the link below:</p>
           <div style="text-align:center;margin:20px 0;">
             <a href="${fileUrl}" style="background-color:#28a745;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none;">Download Acceptance Letter</a>
           </div>`
         : `<p style="font-size:16px;color:#555555;">Your acceptance documents will be sent to you shortly.</p>`
     }
     <p style="font-size:16px;color:#555555;">Congratulations once again on this achievement!</p>`
  );

  await transporter.sendMail({
    from: `"Connect2Uni Admissions" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: `Official Acceptance Letter from ${universityName}`,
    html,
  });
};

// 📧 Solicitor Request Approved
const sendSolicitorRequestApprovedEmail = async (student) => {
  const html = generateEmailTemplate(
    "Solicitor Request Approved",
    "#28a745",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We're pleased to inform you that your request for solicitor assistance has been <strong style="color:#28a745;">approved</strong>!</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#28a745;">What Happens Next?</h4>
       <p style="margin:5px 0;color:#555555;">• Our team is reviewing your case details</p>
       <p style="margin:5px 0;color:#555555;">• We're matching you with the most suitable solicitor</p>
       <p style="margin:5px 0;color:#555555;">• You'll receive another email with your solicitor's contact information</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">This process typically takes 1-2 business days. Thank you for your patience.</p>`
  );

  await transporter.sendMail({
    from: `"Connect2Uni Legal Services" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: "Solicitor Request Approved",
    html,
  });
};

// 📧 Solicitor Assigned
const sendSolicitorAssignedEmail = async (student, solicitor) => {
  const html = generateEmailTemplate(
    "Your Solicitor is Ready",
    "#28a745",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We're excited to connect you with your assigned solicitor who will guide you through the next steps of your application.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#28a745;">Your Solicitor</h4>
       <p style="margin:5px 0;color:#555555;"><strong>Name:</strong> ${solicitor.firstName} ${solicitor.lastName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Email:</strong> ${solicitor.email}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Specialization:</strong> Student Visa Applications</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Your solicitor will reach out to you within 24 hours to schedule your first consultation. In the meantime, feel free to contact them directly with any urgent questions.</p>`,
    {
      text: "Contact Your Solicitor",
      link: `mailto:${solicitor.email}`,
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Legal Services" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: "Solicitor Assigned to Your Request",
    html,
  });
};

// 📧 Receipt Uploaded to University
const sendReceiptUploadedEmailToUniversity = async (
  university,
  student,
  courseName
) => {
  const html = generateEmailTemplate(
    "New Payment Receipt Uploaded",
    "#007bff",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Dear ${
      university.name
    } Admissions Team,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">A student has uploaded a payment receipt that requires your review.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#007bff;">Receipt Details</h4>
       <p style="margin:5px 0;color:#555555;"><strong>Student Name:</strong> ${
         student.firstName
       } ${student.lastName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${courseName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Upload Date:</strong> ${new Date().toLocaleDateString()}</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Please log in to your university portal to review this receipt and update the application status accordingly.</p>`,
    {
      text: "Review in Portal",
      link: "https://yourwebsite.com/university-portal",
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Payments" <${process.env.EMAIL_USER}>`,
    to: university.email,
    subject: "New Payment Receipt Uploaded for Review",
    html,
  });
};

// 📧 Receipt Accepted (Student)
const sendReceiptAcceptedEmail = async (student, application) => {
  const html = generateEmailTemplate(
    "Payment Verified ✅",
    "#28a745",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We're pleased to inform you that your payment receipt has been <strong style="color:#28a745;">verified and accepted</strong>.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#28a745;">Application Details</h4>
       <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${application.university.name}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${application.course.name}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Status:</strong> <span style="color:#28a745;">Payment Verified</span></p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Your application is now one step closer to completion. We'll notify you of any further updates.</p>`,
    {
      text: "View Application Status",
      link: "https://yourwebsite.com/student-portal/application-status",
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Admissions" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: "Payment Receipt Accepted",
    html,
  });
};

// 📧 Receipt Rejected (Student)
const sendReceiptRejectedEmail = async (student, application, remark) => {
  const html = generateEmailTemplate(
    "Receipt Requires Attention",
    "#d9534f",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi <strong>${student.firstName}</strong>,</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We've reviewed your payment receipt for <strong>${application.course.name}</strong> at <strong>${application.university.name}</strong> and found some issues that need to be addressed.</p>
     <div style="background-color:#f8f9fa;border-left:4px solid #d9534f;padding:15px;border-radius:0 4px 4px 0;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#d9534f;">Reason for Rejection</h4>
       <p style="margin:0;color:#555555;">${remark}</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Please upload a corrected receipt through your student portal as soon as possible to avoid delays in processing your application.</p>`,
    {
      text: "Upload Corrected Receipt",
      link: "https://yourwebsite.com/student-portal/upload-receipt",
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Payments" <${process.env.EMAIL_USER}>`,
    to: student.email,
    subject: "Payment Receipt Requires Correction",
    html,
  });
};

// 📧 Receipt Notifications (Agency)
const sendReceiptUploadedEmailToAgency = async (
  agency,
  student,
  universityName,
  courseName
) => {
  const html = generateEmailTemplate(
    "Student Uploaded Payment Receipt",
    "#007bff",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi ${
      agency.name
    },</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Your student <strong>${
       student.firstName
     } ${
      student.lastName
    }</strong> has uploaded a payment receipt for your reference.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#007bff;">Application Details</h4>
       <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${universityName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${courseName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Upload Date:</strong> ${new Date().toLocaleDateString()}</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">You can view this receipt and track the application status through your agency portal.</p>`,
    {
      text: "View in Agency Portal",
      link: "https://yourwebsite.com/agency-portal",
    }
  );

  await transporter.sendMail({
    from: `"Connect2Uni Partner Network" <${process.env.EMAIL_USER}>`,
    to: agency.email,
    subject: `New Payment Receipt from ${student.firstName} ${student.lastName}`,
    html,
  });
};

const sendReceiptAcceptedEmailToAgency = async (
  agency,
  student,
  universityName,
  courseName
) => {
  const html = generateEmailTemplate(
    "Student Receipt Accepted",
    "#28a745",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi ${agency.name},</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">We're pleased to inform you that the payment receipt from your student <strong>${student.firstName} ${student.lastName}</strong> has been <strong style="color:#28a745;">accepted</strong>.</p>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#28a745;">Application Details</h4>
       <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${universityName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${courseName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Status:</strong> <span style="color:#28a745;">Payment Verified</span></p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">This brings the application one step closer to completion. We'll notify you of any further updates.</p>`
  );

  await transporter.sendMail({
    from: `"Connect2Uni Partner Network" <${process.env.EMAIL_USER}>`,
    to: agency.email,
    subject: `Receipt Accepted for ${student.firstName} ${student.lastName}`,
    html,
  });
};

const sendReceiptRejectedEmailToAgency = async (
  agency,
  student,
  universityName,
  courseName,
  remark
) => {
  const html = generateEmailTemplate(
    "Student Receipt Requires Correction",
    "#d9534f",
    `<p style="font-size:16px;color:#333333;line-height:1.6;">Hi ${agency.name},</p>
     <p style="font-size:16px;color:#555555;line-height:1.6;">The payment receipt from your student <strong>${student.firstName} ${student.lastName}</strong> requires correction.</p>
     <div style="background-color:#f8f9fa;border-left:4px solid #d9534f;padding:15px;border-radius:0 4px 4px 0;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#d9534f;">Reason for Rejection</h4>
       <p style="margin:0;color:#555555;">${remark}</p>
     </div>
     <div style="background-color:#f8f9fa;border-radius:4px;padding:15px;margin:20px 0;">
       <h4 style="margin:0 0 10px 0;color:#007bff;">Application Details</h4>
       <p style="margin:5px 0;color:#555555;"><strong>University:</strong> ${universityName}</p>
       <p style="margin:5px 0;color:#555555;"><strong>Course:</strong> ${courseName}</p>
     </div>
     <p style="font-size:16px;color:#555555;line-height:1.6;">Please advise your student to upload a corrected receipt through their student portal to avoid delays in processing their application.</p>`
  );

  await transporter.sendMail({
    from: `"Connect2Uni Partner Network" <${process.env.EMAIL_USER}>`,
    to: agency.email,
    subject: `Receipt Correction Needed for ${student.firstName} ${student.lastName}`,
    html,
  });
};

const sendPasswordResetByAdminEmail = async (user, newPassword) => {
  const html = `
    <h2 style="font-family:sans-serif;color:#333;">Hello ${
      user.firstName || "User"
    },</h2>
    <p style="font-size:16px;color:#555;">Your password has been reset by the admin.</p>
    <p style="font-size:16px;color:#333;">Here is your new password:</p>
    <p style="font-size:18px;color:#007bff;"><strong>${newPassword}</strong></p>
    <p>Please log in and change your password immediately after.</p>
    <br>
    <p style="font-size:14px;color:#777;">Regards,<br>Connect2Uni Admin Team</p>
  `;

  await transporter.sendMail({
    from: `"Connect2Uni" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: "Your password has been reset",
    html,
  });
};

// ✅ Export all
module.exports = {
  generateEmailTemplate,
  // COMPANY_LOGO,
  sendVerificationEmail,
  sendRejectionEmail,
  sendPaymentSuccessEmail,
  sendSolicitorPaymentEmail,
  sendAcceptanceEmail,
  sendAgencyNotificationEmail,
  sendOfferLetterEmailByAgency,
  sendSolicitorRequestApprovedEmail,
  sendSolicitorAssignedEmail,
  sendReceiptUploadedEmailToUniversity,
  sendReceiptAcceptedEmail,
  sendReceiptRejectedEmail,
  sendReceiptUploadedEmailToAgency,
  sendReceiptAcceptedEmailToAgency,
  sendReceiptRejectedEmailToAgency,
  sendPasswordResetByAdminEmail,
};

// const nodemailer = require('nodemailer');
// const Student = require('../models/studentsModel');
// const crypto = require('crypto');

// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS
//   }
// });

// // 📦 Reusable Email Template Generator
// const generateEmailTemplate = (title, color, contentHtml) => `
//   <div style="max-width:600px;margin:20px auto;padding:30px;border:1px solid #e0e0e0;border-radius:8px;font-family:Arial,sans-serif;background-color:#ffffff;">
//     <h2 style="color:${color};text-align:center;">${title}</h2>
//     ${contentHtml}
//     <div style="margin-top:30px;text-align:center;color:#999;font-size:12px;">
//       © ${new Date().getFullYear()} Connect2Uni. All rights reserved.
//     </div>
//   </div>
// `;

// // 📧 Send Verification Email
// const sendVerificationEmail = async (student) => {
//   const token = crypto.randomBytes(32).toString('hex');
//   student.verificationToken = token;
//   await student.save();

//   const verificationLink = `https://yourwebsite.com/verify-email?token=${token}`;

//   const html = generateEmailTemplate(
//     'Verify Your Email',
//     '#007bff',
//     `<p style="font-size:16px;">Hi ${student.firstName},</p>
//      <p style="font-size:16px;">Click below to verify your email:</p>
//      <p><a href="${verificationLink}" style="color:#007bff;">Verify Email</a></p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Please verify your email address',
//     html
//   });
// };

// // 📧 Send Application Rejection Email
// const sendRejectionEmail = async (email, reason) => {
//   const html = generateEmailTemplate(
//     'Application Rejected',
//     '#d9534f',
//     `<p style="font-size:16px;">Dear Applicant,</p>
//      <p>Your application has been <strong style="color:#d9534f;">rejected</strong>.</p>
//      <div style="background-color:#f8d7da;padding:15px;border-radius:5px;border:1px solid #f5c6cb;margin:20px 0;">
//        <strong>Reason:</strong>
//        <p style="margin:10px 0 0;color:#721c24;">${reason}</p>
//      </div>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: 'Application Rejection Notification',
//     html
//   });
// };

// // 📧 Send Payment Success Email
// const sendPaymentSuccessEmail = async (student) => {
//   const html = generateEmailTemplate(
//     'Payment Successful',
//     '#28a745',
//     `<p style="font-size:16px;">Hi ${student.firstName},</p>
//      <p>Thank you for your payment of <strong>30 GBP</strong>. Transaction completed.</p>
//      <p>You now have full access to the student portal.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Payment Successful - Thank You!',
//     html
//   });
// };

// // 📧 Solicitor Service Payment Email
// const sendSolicitorPaymentEmail = async (student) => {
//   const html = generateEmailTemplate(
//     'Solicitor Service Payment Successful',
//     '#28a745',
//     `<p style="font-size:16px;">Hi ${student.firstName},</p>
//      <p>Thank you for purchasing the solicitor service. You can now apply for solicitor services.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Solicitor Service Payment Successful',
//     html
//   });
// };

// // 📧 Application Acceptance Email (with attachment link)
// const sendAcceptanceEmailWithAttachment = async (email, fileUrl) => {
//   const html = generateEmailTemplate(
//     'Application Accepted 🎉',
//     '#28a745',
//     `<p>Congratulations! Your application has been <strong style="color:#28a745;">accepted</strong>.</p>
//      ${fileUrl ? `<p><a href="${fileUrl}" style="color:#007bff;">Download your acceptance letter</a></p>` : ''}
//      <p>We look forward to welcoming you!</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: 'Application Accepted - Congratulations!',
//     html
//   });
// };

// // 📧 Notify Agency of Application Status
// const sendAgencyNotificationEmail = async (email, studentName, studentId, status) => {
//   const color = status === 'Rejected' ? '#d9534f' : '#28a745';

//   const html = generateEmailTemplate(
//     `Student Application ${status}`,
//     color,
//     `<p>Dear Partner,</p>
//      <p>The university has <strong>${status}</strong> the application for <strong>${studentName}</strong> (ID: ${studentId}).</p>
//      <p>Please log in to your dashboard for more details.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: `Student Application ${status}`,
//     html
//   });
// };

// // 📧 Solicitor Request Approved
// const sendSolicitorRequestApprovedEmail = async (student) => {
//   const html = generateEmailTemplate(
//     'Solicitor Request Approved',
//     '#28a745',
//     `<p>Hi ${student.firstName},</p>
//      <p>🎉 Your request for solicitor assistance has been <strong>approved</strong>.</p>
//      <p>A solicitor will be assigned to you shortly.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Solicitor Request Approved',
//     html
//   });
// };

// // 📧 Solicitor Assigned
// const sendSolicitorAssignedEmail = async (student, solicitor) => {
//   const html = generateEmailTemplate(
//     'Solicitor Assigned',
//     '#28a745',
//     `<p>Hi ${student.firstName},</p>
//      <p>Your solicitor request has been <strong>approved</strong>.</p>
//      <p>Your assigned solicitor is <strong>${solicitor.firstName} ${solicitor.lastName}</strong>.</p>
//      <p>Contact: ${solicitor.email}</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Solicitor Assigned to Your Request',
//     html
//   });
// };

// // 📧 Receipt Uploaded to University
// const sendReceiptUploadedEmailToUniversity = async (university, student, courseName) => {
//   const html = generateEmailTemplate(
//     'New Payment Receipt Uploaded',
//     '#007bff',
//     `<p>Hi ${university.name},</p>
//      <p>A new receipt was uploaded by <strong>${student.firstName} ${student.lastName}</strong> for <strong>${courseName}</strong>.</p>
//      <p>Please review it via your dashboard.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: university.email,
//     subject: 'New Payment Receipt Uploaded',
//     html
//   });
// };

// // 📧 Receipt Accepted (Student)
// const sendReceiptAcceptedEmail = async (student, application) => {
//   const html = generateEmailTemplate(
//     '🎉 Payment Receipt Accepted',
//     '#28a745',
//     `<p>Hi ${student.firstName},</p>
//      <p>Your payment receipt for <strong>${application.course.name}</strong> at <strong>${application.university.name}</strong> has been <strong>accepted</strong>.</p>
//      <p>Thank you!</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: '🎉 Payment Receipt Accepted',
//     html
//   });
// };

// // 📧 Receipt Rejected (Student)
// const sendReceiptRejectedEmail = async (student, application, remark) => {
//   const html = generateEmailTemplate(
//     '⚠️ Payment Receipt Rejected',
//     '#d9534f',
//     `<p>Hi ${student.firstName},</p>
//      <p>Your payment receipt for <strong>${application.course.name}</strong> at <strong>${application.university.name}</strong> has been <strong>rejected</strong>.</p>
//      <div style="background-color:#f8d7da;padding:15px;border-radius:5px;border:1px solid #f5c6cb;margin:20px 0;">
//        <strong>Reason:</strong>
//        <p style="margin:10px 0 0;color:#721c24;">${remark}</p>
//      </div>
//      <p>Please upload a corrected receipt.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: '⚠️ Payment Receipt Rejected',
//     html
//   });
// };

// // 📧 Receipt Notifications (Agency)
// const sendReceiptUploadedEmailToAgency = async (agency, student, universityName, courseName) => {
//   const html = generateEmailTemplate(
//     'New Payment Receipt Uploaded',
//     '#007bff',
//     `<p>Hi ${agency.name},</p>
//      <p><strong>${student.firstName} ${student.lastName}</strong> uploaded a receipt for <strong>${courseName}</strong> at <strong>${universityName}</strong>.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: agency.email,
//     subject: `🔔 New Payment Receipt by ${student.firstName} ${student.lastName}`,
//     html
//   });
// };

// const sendReceiptAcceptedEmailToAgency = async (agency, student, universityName, courseName) => {
//   const html = generateEmailTemplate(
//     'Receipt Accepted',
//     '#28a745',
//     `<p>Hi ${agency.name},</p>
//      <p>The receipt from <strong>${student.firstName} ${student.lastName}</strong> for <strong>${courseName}</strong> at <strong>${universityName}</strong> was <strong>accepted</strong>.</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: agency.email,
//     subject: `Receipt Accepted for ${student.firstName} ${student.lastName}`,
//     html
//   });
// };

// const sendReceiptRejectedEmailToAgency = async (agency, student, universityName, courseName, remark) => {
//   const html = generateEmailTemplate(
//     'Receipt Rejected',
//     '#d9534f',
//     `<p>Hi ${agency.name},</p>
//      <p>The receipt from <strong>${student.firstName} ${student.lastName}</strong> for <strong>${courseName}</strong> at <strong>${universityName}</strong> was <strong>rejected</strong>.</p>
//      <p><strong>Reason:</strong> ${remark}</p>`
//   );

//   await transporter.sendMail({
//     from: process.env.EMAIL_USER,
//     to: agency.email,
//     subject: `Receipt Rejected for ${student.firstName} ${student.lastName}`,
//     html
//   });
// };

// // ✅ Export all
// module.exports = {
//   sendVerificationEmail,
//   sendRejectionEmail,
//   sendPaymentSuccessEmail,
//   sendSolicitorPaymentEmail,
//   sendAcceptanceEmailWithAttachment,
//   sendAgencyNotificationEmail,
//   sendSolicitorRequestApprovedEmail,
//   sendSolicitorAssignedEmail,
//   sendReceiptUploadedEmailToUniversity,
//   sendReceiptAcceptedEmail,
//   sendReceiptRejectedEmail,
//   sendReceiptUploadedEmailToAgency,
//   sendReceiptAcceptedEmailToAgency,
//   sendReceiptRejectedEmailToAgency
// };

// // services/emailService.js

// const nodemailer = require('nodemailer');
// const Student = require('../models/studentsModel');
// const crypto = require('crypto');

// // ✅ Define transporter globally at the top
// const transporter = nodemailer.createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.EMAIL_USER,  // Stored in .env for security
//     pass: process.env.EMAIL_PASS   // Stored in .env for security
//   }
// });

// // ✅ Send Verification Email
// const sendVerificationEmail = async (student) => {
//   const token = crypto.randomBytes(32).toString('hex');
//   student.verificationToken = token;
//   await student.save();

//   const verificationLink = `https://yourwebsite.com/verify-email?token=${token}`;

//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Please verify your email address',
//     text: `Click here to verify your email: ${verificationLink}`,
//   };

//   await transporter.sendMail(mailOptions);
// };

// // ✅ Send Rejection Email
// const sendRejectionEmail = async (email, reason) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: 'Application Rejection Notification',
//     html: `
//       <div style="max-width: 600px; margin: 20px auto; padding: 30px; border: 1px solid #e0e0e0; border-radius: 8px; font-family: Arial, sans-serif; background-color: #ffffff;">
//         <h2 style="color: #d9534f; text-align: center;">Application Rejected</h2>
//         <p style="font-size: 16px; color: #333333;">Dear Applicant,</p>
//         <p style="font-size: 16px; color: #333333;">We regret to inform you that your application has been <strong style="color: #d9534f;">rejected</strong>.</p>
//         <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; border: 1px solid #f5c6cb; margin: 20px 0;">
//           <strong>Reason for Rejection:</strong>
//           <p style="margin: 10px 0 0; color: #721c24;">${reason}</p>
//         </div>
//         <p style="font-size: 14px; color: #555555;">If you have any questions, feel free to reach out to our support team.</p>
//         <p style="font-size: 14px; color: #555555;">Thank you for your interest.</p>
//         <div style="margin-top: 30px; text-align: center; color: #999999; font-size: 12px;">
//           © ${new Date().getFullYear()} Your Company Name. All rights reserved.
//         </div>
//       </div>
//     `,
//   };

//   await transporter.sendMail(mailOptions);
// };

// const sendPaymentSuccessEmail = async (student) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Payment Successful - Thank You!',
//     text: `Hi ${student.firstName},\n\nThank you for your payment of £20. Your transaction has been successfully completed, and you now have full access to the student portal.\n\nBest regards,\nYour University Team`,
//   };

//   await transporter.sendMail(mailOptions);
// };

// const sendSolicitorPaymentEmail = async (student) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Solicitor Service Payment Successful',
//     text: `Hi ${student.firstName},\n\nThank you for purchasing the solicitor service. Now you can apply for solicitor services.\n\nRegards,\nYour University Team`,
//   };
//   await transporter.sendMail(mailOptions);
// };

// const sendAcceptanceEmailWithAttachment = async (email, fileUrl) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject: 'Application Accepted - Congratulations!',
//     html: `
//       <p>Congratulations! Your application has been <b>accepted</b>.</p>
//       ${fileUrl ? `<p>You can download your acceptance letter here: <a href="${fileUrl}" target="_blank">Download Letter</a></p>` : ''}
//       <p>We look forward to welcoming you to our university!</p>
//     `,
//   };

//   await transporter.sendMail(mailOptions);
// };

// // ✅ Send Notification Email to Agency
// const sendAgencyNotificationEmail = async (email, studentName, studentId, status) => {
//   const subject = `Student Application ${status}`;
//   const text = `Dear Partner,\n\nThe university has ${status.toLowerCase()} the application for ${studentName} (Student ID: ${studentId}).\n\nPlease log in to your agency dashboard for more details.\n\nThank you.`;

//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: email,
//     subject,
//     text,
//   };

//   await transporter.sendMail(mailOptions);
// };

// // ✅ Send Email to Student When Solicitor Request is Approved
// const sendSolicitorRequestApprovedEmail = async (student) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Solicitor Request Approved',
//     html: `
//       <p>Hi ${student.firstName},</p>
//       <p>🎉 Congratulations! Your request for solicitor assistance has been <b>approved</b>.</p>
//       <p>Sooner a solicitor will be assigned to guide you through the visa process shortly.</p>
//       <p>We’ll notify you once the assignment is complete.</p>
//       <br />
//       <p>Best regards,<br />Student Services Team</p>
//     `
//   };

//   await transporter.sendMail(mailOptions);
// };

// // ✅ Send Email to Student When Solicitor is Assigned After Request Approval
// const sendSolicitorAssignedEmail = async (student, solicitor) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: 'Solicitor Assigned to Your Request',
//     html: `
//       <p>Hi ${student.firstName},</p>
//       <p>🎉 Good news — your solicitor service request has been <b>approved</b>!</p>
//       <p>Your assigned solicitor is <b>${solicitor.firstName} ${solicitor.lastName}</b>. They will be reaching out to you shortly to assist with your visa application process.</p>
//        <p> You can reach Assigned solicitor at ${solicitor.email} </p>
//       <br />
//       <p>Best regards,<br />Student Services Team</p>
//     `
//   };

//   await transporter.sendMail(mailOptions);
// };

// const sendReceiptUploadedEmailToUniversity = async (university, student, courseName) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: university.email,
//     subject: 'New Payment Receipt Uploaded',
//     html: `
//       <p>Hi ${university.name},</p>
//       <p>📄 A new payment receipt has been uploaded by <b>${student.firstName} ${student.lastName}</b> for the course <b>${courseName}</b>.</p>
//       <p>Please log in to your university dashboard to review and process the receipt at your earliest convenience.</p>
//       <br />
//       <p>Best regards,<br />Student Services Team</p>
//     `
//   };

//   await transporter.sendMail(mailOptions);
// };

// // 📩 Email when receipt accepted
// const sendReceiptAcceptedEmail = async (student, application) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: '🎉 Payment Receipt Accepted',
//     html: `
//       <p>Hi ${student.firstName},</p>
//       <p>Good news — your payment receipt for <b>${application.course.name}</b> at <b>${application.university.name}</b> has been <b>accepted</b> by the university.</p>
//       <p>Thank you for completing your payment.</p>
//       <br />
//       <p>Best regards,<br />Admissions Team</p>
//     `
//   };

//   await transporter.sendMail(mailOptions);
// };

// // 📩 Email when receipt rejected
// const sendReceiptRejectedEmail = async (student, application, remark) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: student.email,
//     subject: '⚠️ Payment Receipt Rejected',
//     html: `
//       <p>Hi ${student.firstName},</p>
//       <p>Your payment receipt for <b>${application.course.name}</b> at <b>${application.university.name}</b> has been <b>rejected</b>.</p>
//       <p><b>Reason:</b> ${remark}</p>
//       <p>Please review and upload a corrected receipt at your earliest convenience.</p>
//       <br />
//       <p>Best regards,<br />Admissions Team</p>
//     `
//   };

//   await transporter.sendMail(mailOptions);
// };

// const sendReceiptUploadedEmailToAgency = async (agency, student, universityName, courseName) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: agency.email,
//     subject: `🔔 New Payment Receipt Uploaded by ${student.firstName} ${student.lastName}`,
//     html: `
//       <p>Hi ${agency.name},</p>
//       <p>A new payment receipt has been uploaded by <b>${student.firstName} ${student.lastName}</b> for the course <b>"${courseName}"</b> at <b>${universityName}</b>.</p>
//       <p>Please log in to your portal to review the details and take further action if necessary.</p>
//       <br />
//       <p>Best regards,<br />Admissions Team</p>
//     `
//   };

//   await transporter.sendMail(mailOptions);
// };

// const sendReceiptAcceptedEmailToAgency = async (agency, student, universityName, courseName) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: agency.email,
//     subject: `Receipt Accepted for ${student.firstName} ${student.lastName}`,
//     html: `
//       <p>Hi ${agency.name},</p>
//       <p>The payment receipt submitted by <b>${student.firstName} ${student.lastName}</b> for the course <b>"${courseName}"</b> at <b>${universityName}</b> has been <b>accepted</b>.</p>
//       <p>Please log in to your portal to view the updated application details.</p>
//       <br />
//       <p>Best regards,<br />Admissions Team</p>
//     `,
//   };

//   await transporter.sendMail(mailOptions);
// };

// const sendReceiptRejectedEmailToAgency = async (agency, student, universityName, courseName, remark) => {
//   const mailOptions = {
//     from: process.env.EMAIL_USER,
//     to: agency.email,
//     subject: `Receipt Rejected for ${student.firstName} ${student.lastName}`,
//     html: `
//       <p>Hi ${agency.name},</p>
//       <p>The payment receipt submitted by <b>${student.firstName} ${student.lastName}</b> for the course <b>"${courseName}"</b> at <b>${universityName}</b> has been <b>rejected</b>.</p>
//       <p><b>Reason:</b> ${remark}</p>
//       <p>Please coordinate with the student to resubmit a correct receipt if needed.</p>
//       <br />
//       <p>Best regards,<br />Admissions Team</p>
//     `,
//   };

//   await transporter.sendMail(mailOptions);
// };

// // ✅ Export functions
// module.exports = {
//   sendVerificationEmail,
//   sendRejectionEmail,
//   sendPaymentSuccessEmail,
//   sendSolicitorPaymentEmail,
//   sendAcceptanceEmailWithAttachment,
//   sendAgencyNotificationEmail,
//   sendSolicitorRequestApprovedEmail,
//   sendSolicitorAssignedEmail,
//   sendReceiptUploadedEmailToUniversity,
//   sendReceiptAcceptedEmail,
//   sendReceiptRejectedEmail,
//   sendReceiptUploadedEmailToAgency,
//   sendReceiptAcceptedEmailToAgency,
//   sendReceiptRejectedEmailToAgency
// };
