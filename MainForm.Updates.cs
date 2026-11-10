using System;
using System.Drawing;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using CupheadTrainingApp.Services;

namespace CupheadTrainingApp
{
    public sealed partial class MainForm
    {
        private readonly CancellationTokenSource updateLifetime = new CancellationTokenSource();
        private bool checkedForUpdates;
#if !DEVELOPER_BUILD
        private bool updateCheckInProgress;
#endif

        private async Task CheckForUpdatesAsync(bool manual)
        {
#if DEVELOPER_BUILD
            if (manual) MessageBox.Show(this, "Automatic updates are disabled in the developer build.", Text);
            await Task.CompletedTask;
#else
            if (updateCheckInProgress || updateLifetime.IsCancellationRequested) return;
            updateCheckInProgress = true;
            bool portuguese = false;
            string Local(string en, string pt) => portuguese ? pt : en;
            try
            {
                portuguese = await webView.CoreWebView2.ExecuteScriptAsync(
                    "localStorage.getItem('cuphead-training-lang') === 'pt-BR'") == "true";

                using var check = CancellationTokenSource.CreateLinkedTokenSource(updateLifetime.Token);
                check.CancelAfter(TimeSpan.FromSeconds(20));
                var update = await AppUpdates.CheckAsync(check.Token);
                if (updateLifetime.IsCancellationRequested) return;
                if (update == null)
                {
                    if (manual) MessageBox.Show(this, Local(
                        $"You’re up to date (v{AppUpdates.InstalledVersion}).",
                        $"O aplicativo está atualizado (v{AppUpdates.InstalledVersion})."), Text);
                    return;
                }

                using var dialog = new Form
                {
                    Text = Local("Update available", "Atualização disponível"),
                    ClientSize = new Size(580, 385),
                    MinimumSize = new Size(450, 300),
                    StartPosition = FormStartPosition.CenterParent,
                    ShowInTaskbar = false,
                    MaximizeBox = false,
                    MinimizeBox = false
                };
                var layout = new TableLayoutPanel
                {
                    Dock = DockStyle.Fill, Padding = new Padding(14),
                    ColumnCount = 1, RowCount = 3
                };
                layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
                layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
                layout.RowStyles.Add(new RowStyle(SizeType.AutoSize));
                var status = new Label
                {
                    AutoSize = true, Margin = new Padding(3, 3, 3, 9),
                    Text = Local($"What’s new since v{AppUpdates.InstalledVersion}  →  v{update.Latest.Version}",
                        $"Novidades desde a v{AppUpdates.InstalledVersion}  →  v{update.Latest.Version}")
                };
                var notes = new TextBox
                {
                    Dock = DockStyle.Fill, Multiline = true, ReadOnly = true, ScrollBars = ScrollBars.Vertical,
                    Text = update.Changelog.ReplaceLineEndings("\r\n")
                };
                var buttons = new FlowLayoutPanel
                {
                    Dock = DockStyle.Fill, AutoSize = true, FlowDirection = FlowDirection.RightToLeft
                };
                var install = new Button { AutoSize = true, Text = Local("Update and restart", "Atualizar e reiniciar") };
                var later = new Button { AutoSize = true, Text = Local("Later", "Mais tarde") };
                buttons.Controls.Add(install);
                buttons.Controls.Add(later);
                layout.Controls.Add(status, 0, 0);
                layout.Controls.Add(notes, 0, 1);
                layout.Controls.Add(buttons, 0, 2);
                dialog.Controls.Add(layout);
                dialog.CancelButton = later;

                bool ready = false;
                using var download = CancellationTokenSource.CreateLinkedTokenSource(updateLifetime.Token);
                later.Click += (sender, args) => dialog.Close();
                dialog.FormClosing += (sender, args) => { if (!ready) download.Cancel(); };
                install.Click += async (sender, args) =>
                {
                    install.Enabled = false;
                    later.Text = Local("Cancel", "Cancelar");
                    status.Text = Local("Downloading and verifying the update…", "Baixando e verificando a atualização…");
                    download.CancelAfter(TimeSpan.FromMinutes(5));
                    try
                    {
                        await AppUpdates.DownloadAndLaunchInstallerAsync(update, Local(
                            "The update could not be installed.", "Não foi possível instalar a atualização."), download.Token);
                        ready = true;
                        dialog.Close();
                    }
                    catch (Exception ex)
                    {
                        if (dialog.IsDisposed || !dialog.Visible) return;
                        MessageBox.Show(dialog, Local("Could not prepare the update.", "Não foi possível preparar a atualização.")
                            + "\r\n\r\n" + ex.Message, dialog.Text, MessageBoxButtons.OK, MessageBoxIcon.Warning);
                        dialog.Close();
                    }
                };
                dialog.ShowDialog(this);
                if (ready) Close();
            }
            catch (Exception ex)
            {
                if (manual && !updateLifetime.IsCancellationRequested)
                    MessageBox.Show(this, Local("Could not check for updates.", "Não foi possível verificar atualizações.")
                        + "\r\n\r\n" + ex.Message, Text, MessageBoxButtons.OK, MessageBoxIcon.Warning);
            }
            finally { updateCheckInProgress = false; }
#endif
        }
    }
}
