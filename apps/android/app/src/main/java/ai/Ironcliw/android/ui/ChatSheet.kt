package ai.Ironcliw.android.ui

import androidx.compose.runtime.Composable
import ai.Ironcliw.android.MainViewModel
import ai.Ironcliw.android.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}

