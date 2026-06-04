import { useStore } from "./store/gameStore";
import { SetupScreen } from "./screens/SetupScreen";
import { GameScreen } from "./screens/GameScreen";
import { SettleScreen } from "./screens/SettleScreen";
import { HistoryScreen } from "./screens/HistoryScreen";

export default function App() {
  const { state } = useStore();
  switch (state.screen) {
    case "game":
      return <GameScreen />;
    case "settle":
      return <SettleScreen />;
    case "history":
      return <HistoryScreen />;
    case "setup":
    default:
      return <SetupScreen />;
  }
}
