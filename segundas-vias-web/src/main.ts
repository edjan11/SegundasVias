import { setupUI } from "./ui";
import "./style.css";

const app = document.querySelector<HTMLDivElement>('#app');
if (app) {
  setupUI(app);
}
