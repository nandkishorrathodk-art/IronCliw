package ai.ironcliw.app.ui

import androidx.compose.runtime.Composable
import ai.ironcliw.app.MainViewModel
import ai.ironcliw.app.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
