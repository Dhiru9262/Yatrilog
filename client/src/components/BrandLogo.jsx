import logo from "../assets/yatrilog-logo.png";
import { COMPANY_NAME } from "../config/appConfig";

const BrandLogo = ({ className = "", alt = COMPANY_NAME }) => (
  <img
    src={logo}
    className={`brand-logo-image ${className}`.trim()}
    alt={alt}
    draggable="false"
  />
);

export default BrandLogo;
