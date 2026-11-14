"""Transparent, configurable terrain-cost model for Gale routing.

The model is a *documented algorithmic preference*, not an astronaut
physiology, energy-expenditure, or safety model.  It converts a traversed edge
into equivalent horizontal metres:

    cost = ground_distance
           * (1
              + uphill_weight   * min(tan(theta_up), max_grade)
              + downhill_weight * min(tan(theta_down), max_grade)
              + cross_slope_weight * (max_cell_slope / reference_slope)^2)

where ``theta`` is the signed directional grade of the edge and
``max_cell_slope`` is the steeper Horn 3x3 cell slope at the two endpoints.

Every weight is dimensionless and nonnegative.  With all weights at zero the
model reduces exactly to shortest ground distance.  The defaults deliberately
avoid a hard slope threshold: there is no documented astronaut-safe slope in
this repository, so no such threshold is invented.
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class EdgeCost:
    distance_m: float
    dz_m: float
    grade_tangent: float
    grade_deg: float
    penalty: float
    cost_m: float


@dataclass(frozen=True)
class CostModel:
    """Nonnegative terrain penalty applied to each graph edge."""

    uphill_weight: float = 3.0
    downhill_weight: float = 0.75
    cross_slope_weight: float = 0.5
    slope_reference_deg: float = 20.0
    max_grade_tangent: float = 3.0

    def __post_init__(self) -> None:
        values = {
            "uphill_weight": self.uphill_weight,
            "downhill_weight": self.downhill_weight,
            "cross_slope_weight": self.cross_slope_weight,
            "slope_reference_deg": self.slope_reference_deg,
            "max_grade_tangent": self.max_grade_tangent,
        }
        for name, value in values.items():
            if not math.isfinite(value) or value < 0.0:
                raise ValueError(f"{name} must be finite and nonnegative")
        if self.slope_reference_deg <= 0.0:
            raise ValueError("slope_reference_deg must be positive")
        if self.max_grade_tangent <= 0.0:
            raise ValueError("max_grade_tangent must be positive")

    def edge(
        self,
        distance_m: float,
        dz_m: float,
        slope_a_deg: float,
        slope_b_deg: float,
    ) -> EdgeCost:
        """Return the terrain cost of traversing one graph edge."""
        if not math.isfinite(distance_m) or distance_m <= 0.0:
            raise ValueError("edge distance must be finite and positive")
        if not math.isfinite(dz_m):
            raise ValueError("edge elevation change must be finite")
        if not (math.isfinite(slope_a_deg) and math.isfinite(slope_b_deg)):
            raise ValueError("endpoint slopes must be finite")

        grade = dz_m / distance_m
        uphill = min(max(grade, 0.0), self.max_grade_tangent)
        downhill = min(max(-grade, 0.0), self.max_grade_tangent)
        cell_slope = max(slope_a_deg, slope_b_deg)
        cross_term = self.cross_slope_weight * (
            cell_slope / self.slope_reference_deg
        ) ** 2

        penalty = 1.0 + self.uphill_weight * uphill + self.downhill_weight * downhill + cross_term
        if not math.isfinite(penalty) or penalty < 1.0:
            raise ValueError("computed terrain penalty is invalid")

        return EdgeCost(
            distance_m=distance_m,
            dz_m=dz_m,
            grade_tangent=grade,
            grade_deg=math.degrees(math.atan(grade)),
            penalty=penalty,
            cost_m=distance_m * penalty,
        )

    def describe(self) -> dict[str, object]:
        """Serialisable description for route outputs and audit reports."""
        return {
            "name": "gale-terrain-penalty-v1",
            "units": "equivalent horizontal metres",
            "formula": (
                "distance * (1 + uphill_weight*min(tan(theta_up), max_grade) "
                "+ downhill_weight*min(tan(theta_down), max_grade) "
                "+ cross_slope_weight*(max_endpoint_horn_slope/reference_slope)^2)"
            ),
            "uphillWeight": self.uphill_weight,
            "downhillWeight": self.downhill_weight,
            "crossSlopeWeight": self.cross_slope_weight,
            "slopeReferenceDegrees": self.slope_reference_deg,
            "maxGradeTangent": self.max_grade_tangent,
            "interpretation": (
                "Algorithmic terrain preference, not astronaut physiology, "
                "metabolic cost, or a certified safety threshold."
            ),
        }


DISTANCE_ONLY = CostModel(
    uphill_weight=0.0,
    downhill_weight=0.0,
    cross_slope_weight=0.0,
)
