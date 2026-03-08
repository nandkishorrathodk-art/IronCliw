package ai.IronCliw.android.ui

import androidx.compose.runtime.Composable
import ai.IronCliw.android.MainViewModel
import ai.IronCliw.android.ui.chat.ChatSheetContent

@Composable
fun ChatSheet(viewModel: MainViewModel) {
  ChatSheetContent(viewModel = viewModel)
}
