using System;

namespace CupheadMusicPlayer.Engine
{
    public class SceneDetection : IDisposable
    {
        private readonly MemoryManager memory;
        private string currentScene;

        public string CurrentScene => currentScene;

        public bool IsHooked => memory.IsHooked;

        public bool IsLoading
        {
            get
            {
                if (!memory.IsHooked)
                    return true;

                try { return memory.Loading(); }
                catch { return true; }
            }
        }

        public event Action<string> SceneChanged;

        public SceneDetection()
        {
            memory = new MemoryManager();
            currentScene = null;
        }

        public void Update()
        {
            // Always let MemoryManager verify the current Cuphead process.
            // This is important when Cuphead is closed and relaunched.
            if (!memory.HookProcess())
            {
                SetScene(null);
                return;
            }

            // Make sure the process still exists.
            if (memory.Program == null || memory.Program.HasExited)
            {
                SetScene(null);
                return;
            }

            string scene;

            try
            {
                // While Cuphead is loading a new scene, don't report an active scene.
                if (memory.Loading())
                {
                    SetScene(null);
                    return;
                }

                scene = memory.SceneName();
            }
            catch
            {
                SetScene(null);
                return;
            }

            if (string.IsNullOrWhiteSpace(scene))
            {
                SetScene(null);
                return;
            }

            SetScene(scene);
        }

        private void SetScene(string scene)
        {
            if (string.Equals(currentScene, scene, StringComparison.OrdinalIgnoreCase))
                return;

            currentScene = scene;

            SceneChanged?.Invoke(currentScene);
        }

        public bool IsScene(string sceneName)
            => string.Equals(CurrentScene, sceneName, StringComparison.OrdinalIgnoreCase);

        public string Diagnose()
        {
            try
            {
                memory.HookProcess();
                if (memory.Program == null || memory.Program.HasExited)
                    return "Not hooked (Cuphead not found)";

                string pointers;
                try { pointers = memory.GamePointers(); }
                catch (Exception ex) { pointers = "error: " + ex.Message; }

                string loading;
                try { loading = memory.Loading() ? "true (loading)" : "false (ready)"; }
                catch (Exception ex) { loading = "error: " + ex.Message; }

                string scene;
                try { scene = memory.SceneName() ?? string.Empty; }
                catch (Exception ex) { scene = "error: " + ex.Message; }

                return $"PD/SL/LV: {pointers} | loading={loading} | rawScene='{scene}'";
            }
            catch (Exception ex)
            {
                return "diagnose error: " + ex.Message;
            }
        }

        public void Dispose()
        {
            memory.Dispose();
        }
    }
}
