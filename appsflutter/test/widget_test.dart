// Basic smoke test for Classify Flutter app.

import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:classify_flutter/app.dart';

void main() {
  testWidgets('App renders smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: ClassifyApp()),
    );

    // Just verify the app builds without crashing
    await tester.pump();
  });
}
