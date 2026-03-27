import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_hi/main.dart';

void main() {
  testWidgets(
    'Displays greeting on app launch',
    (WidgetTester tester) async {

      await tester.pumpWidget(const MyApp());

   
      expect(find.text('Greeting App'), findsOneWidget);

      expect(
        find.text('Hi my name is Afonso Maçarico'),
        findsOneWidget,
      );
    },
  );
}