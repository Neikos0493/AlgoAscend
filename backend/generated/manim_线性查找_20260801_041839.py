```python
from manim import *
import random

class LinearSearch(Scene):
    def construct(self):
        # Dark background
        self.camera.background_color = "#1e1e2e"

        n = 16
        values = random.sample(range(10, 100), n)
        target = values[8]  # target exists in the array

        # Title
        title = Text("Linear Search", font_size=42, color=WHITE).to_edge(UP)
        self.play(Write(title))

        # Target display
        target_text = Text(f"Searching for: {target}", font_size=30, color=YELLOW)
        target_text.next_to(title, DOWN, buff=0.4)
        self.play(FadeIn(target_text))

        # Build array squares
        squares = VGroup(*[
            Square(side_length=0.6, fill_color=BLUE, fill_opacity=0.8,
                   stroke_color=WHITE, stroke_width=1.5)
            for _ in range(n)
        ])
        squares.arrange(RIGHT, buff=0.1)
        squares.shift(UP * 1)

        # Value and index labels
        value_labels = VGroup()
        index_labels = VGroup()

        for sq, v, i in zip(squares, values, range(n)):
            val_text = Text(str(v), font_size=22, color=WHITE).move_to(sq.get_center())
            value_labels.add(val_text)

            idx_text = Text(str(i), font_size=16, color=GRAY)
            idx_text.next_to(sq, DOWN, buff=0.1)
            index_labels.add(idx_text)

        self.play(FadeIn(squares), FadeIn(value_labels), FadeIn(index_labels))

        # Complexity note
        complexity = Text("Time Complexity: O(n)", font_size=24, color=GRAY).to_edge(DOWN)
        self.play(FadeIn(complexity))

        # Arrow to point at current element
        arrow = Triangle(fill_color=YELLOW, fill_opacity=1,
                         stroke_color=YELLOW, stroke_width=1,
                         side_length=0.25)
        arrow.rotate(PI)  # point downward
        arrow.next_to(squares[0], UP, buff=0.05)
        self.play(FadeIn(arrow))
        self.wait(0.3)

        found = False
        found_index = -1

        # Linear scan
        for i in range(n):
            # Move arrow & highlight current square yellow
            self.play(
                squares[i].animate.set_fill(YELLOW),
                arrow.animate.next_to(squares[i], UP, buff=0.05),
                run_time=0.4
            )
            self.wait(0.2)

            if values[i] == target:
                # Found -> green
                self.play(squares[i].animate.set_fill(GREEN))
                found = True
                found_index = i
                break
            else:
                # Not matched -> revert to blue
                self.play(squares[i].animate.set_fill(BLUE), run_time=0.2)

        # Result message
        if found:
            result = Text(f"Found at index {found_index}", font_size=28,