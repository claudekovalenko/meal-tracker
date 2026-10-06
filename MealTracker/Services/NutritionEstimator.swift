import Foundation

/// One food item Claude identified in the user's description.
struct EstimatedItem: Codable, Identifiable, Equatable {
    var id = UUID()
    var name: String
    var portion: String
    var calories: Double
    var protein: Double
    var carbs: Double
    var fat: Double

    var macros: Macros { Macros(calories: calories, protein: protein, carbs: carbs, fat: fat) }

    enum CodingKeys: String, CodingKey {
        case name, portion, calories
        case protein = "protein_g"
        case carbs = "carbs_g"
        case fat = "fat_g"
    }
}

struct MealEstimate: Codable {
    var items: [EstimatedItem]
    /// Any assumptions Claude made (portion sizes, cooking method, brand).
    var notes: String
}

enum NutritionEstimatorError: LocalizedError {
    case missingAPIKey
    case api(String)
    case refused
    case unexpectedResponse

    var errorDescription: String? {
        switch self {
        case .missingAPIKey: return "Add your Anthropic API key in Settings to calculate macros."
        case .api(let message): return message
        case .refused: return "Claude couldn't estimate this meal. Try rewording it."
        case .unexpectedResponse: return "Got an unexpected response. Please try again."
        }
    }
}

/// Turns a free-text meal description into per-item calories and macros
/// using the Claude Messages API.
struct NutritionEstimator {
    static let apiKeyAccount = "anthropic-api-key"

    var model = "claude-opus-5-5"
    var session: URLSession = .shared

    private static let systemPrompt = """
    You are a nutrition estimator for a calorie and macro tracking app. The user \
    describes what they ate in everyday language. Break the description into \
    individual food items and estimate calories, protein, carbohydrates, and fat \
    for each, using standard references such as USDA FoodData Central and typical \
    restaurant or package nutrition labels for named brands and chains.

    - When a quantity is missing, assume a typical single serving and state it in `portion`.
    - Include cooking oils, butter, dressings, and sauces that are implied by the \
      description (e.g. "fried", "sauteed", "with ranch").
    - Calories should be consistent with the macros (about 4 kcal/g protein and \
      carbs, 9 kcal/g fat).
    - Use `notes` for a short, plain-language list of the main assumptions you made, \
      or an empty string if none.
    """

    private static let outputSchema: [String: Any] = [
        "type": "object",
        "properties": [
            "items": [
                "type": "array",
                "items": [
                    "type": "object",
                    "properties": [
                        "name": ["type": "string"],
                        "portion": ["type": "string"],
                        "calories": ["type": "number"],
                        "protein_g": ["type": "number"],
                        "carbs_g": ["type": "number"],
                        "fat_g": ["type": "number"],
                    ],
                    "required": ["name", "portion", "calories", "protein_g", "carbs_g", "fat_g"],
                    "additionalProperties": false,
                ],
            ],
            "notes": ["type": "string"],
        ],
        "required": ["items", "notes"],
        "additionalProperties": false,
    ]

    func estimate(_ description: String) async throws -> MealEstimate {
        guard let apiKey = Keychain.string(for: Self.apiKeyAccount), !apiKey.isEmpty else {
            throw NutritionEstimatorError.missingAPIKey
        }

        let body: [String: Any] = [
            "model": model,
            "max_tokens": 16000,
            "system": Self.systemPrompt,
            "messages": [["role": "user", "content": description]],
            "output_config": [
                "effort": "medium",
                "format": ["type": "json_schema", "schema": Self.outputSchema],
            ],
            // If a request is declined, let the API retry it on a recommended fallback model.
            "fallbacks": "default",
        ]

        var request = URLRequest(url: URL(string: "https://api.anthropic.com/v1/messages")!)
        request.httpMethod = "POST"
        request.timeoutInterval = 120
        request.setValue(apiKey, forHTTPHeaderField: "x-api-key")
        request.setValue("2023-06-01", forHTTPHeaderField: "anthropic-version")
        request.setValue("server-side-fallback-2026-07-01", forHTTPHeaderField: "anthropic-beta")
        request.setValue("application/json", forHTTPHeaderField: "content-type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await session.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0

        guard (200..<300).contains(status) else {
            let apiError = try? JSONDecoder().decode(APIErrorEnvelope.self, from: data)
            switch status {
            case 401: throw NutritionEstimatorError.api("Your Anthropic API key was rejected. Check it in Settings.")
            case 429: throw NutritionEstimatorError.api("Rate limited by the API. Wait a moment and try again.")
            default: throw NutritionEstimatorError.api(apiError?.error.message ?? "Request failed (HTTP \(status)).")
            }
        }

        let message = try JSONDecoder().decode(MessageResponse.self, from: data)
        if message.stop_reason == "refusal" { throw NutritionEstimatorError.refused }

        // Structured output arrives as JSON in the text block (thinking blocks may precede it).
        guard let text = message.content.first(where: { $0.type == "text" })?.text,
              let json = text.data(using: .utf8),
              let estimate = try? JSONDecoder().decode(MealEstimate.self, from: json) else {
            throw NutritionEstimatorError.unexpectedResponse
        }
        return estimate
    }
}

private struct MessageResponse: Decodable {
    struct Block: Decodable {
        let type: String
        let text: String?
    }
    let content: [Block]
    let stop_reason: String?
}

private struct APIErrorEnvelope: Decodable {
    struct Detail: Decodable { let message: String }
    let error: Detail
}
