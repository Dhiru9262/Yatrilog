import BrandLogo from "./BrandLogo";
import { COMPANY_NAME } from "../config/appConfig";

const SplashScreen = () => (
  <main className="splash-screen" aria-label={`Loading ${COMPANY_NAME}`}>
    <div className="splash-content">
      <BrandLogo className="splash-logo" />
      <p className="splash-tagline">Your journey, made simple.</p>
      <div className="splash-loader" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  </main>
);

export default SplashScreen;
