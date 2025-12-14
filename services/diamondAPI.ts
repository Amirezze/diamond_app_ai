/**
 * Diamond Analysis API Service
 *
 * Handles communication with Hugging Face diamond analysis APIs:
 * - Combined shape + color classification (primary method)
 * - Cut quality prediction
 * - Legacy Roboflow shape detection (deprecated)
 */

import axios from 'axios';

export interface CutPredictionResponse {
  cutGrade: string;
  confidence: number;
  allProbabilities: Record<string, number>;
}

export interface ColorPredictionResponse {
  colorGrade: string;
  confidence: number;
  allProbabilities: Record<string, number>;
  giaGrades?: string;
  description?: string;
}

export interface ShapeDetectionResponse {
  shape: string;
  confidence: number;
  allPredictions?: Array<{
    class: string;
    confidence: number;
  }>;
}

export interface ClarityPredictionResponse {
  clarityGrade: string;
  confidence: number;
  allProbabilities: Record<string, number>;
  description?: string;
}

export interface CombinedDiamondAnalysisResponse {
  shape: {
    shape: string;
    confidence: number;
    allProbabilities: Record<string, number>;
  };
  color: {
    colorGrade: string;
    confidence: number;
    allProbabilities: Record<string, number>;
    giaGrades?: string;
    description?: string;
  };
  clarity?: {
    clarityGrade: string;
    confidence: number;
    allProbabilities: Record<string, number>;
    description?: string;
  };
}

export interface ApiError {
  message: string;
  status?: number;
}

/**
 * Analyzes diamond for both shape and color using combined Hugging Face model
 *
 * @param imageUri - Local URI of the image file
 * @param base64Data - Base64 encoded image data
 * @returns Promise with combined shape and color analysis
 * @throws ApiError if the request fails
 */
export async function analyzeDiamond(
  imageUri: string,
  base64Data?: string
): Promise<CombinedDiamondAnalysisResponse> {
  const BASE_URL = 'https://amirezze-diamond-color-grading.hf.space';

  const API_PATHS = [
    { prefix: '/gradio_api/call', name: '/predict_diamond' },
    { prefix: '/call', name: '/predict_diamond' },
    { prefix: '/gradio_api/call', name: '/predict' },
    { prefix: '/call', name: '/predict' },
    { prefix: '/api', name: '/predict_diamond' },
  ];

  let lastError: any = null;

  if (!base64Data) {
    throw {
      message: 'Base64 image data is required for API call',
    } as ApiError;
  }

  let imageData = base64Data;
  if (!imageData.startsWith('data:image')) {
    imageData = `data:image/jpeg;base64,${imageData}`;
  }

  console.log('📦 Combined analysis payload preview:', {
    dataLength: imageData.length,
    hasDataPrefix: imageData.startsWith('data:image'),
  });

  for (const apiPath of API_PATHS) {
    try {
      console.log(`🔍 Trying combined endpoint: ${apiPath.prefix}${apiPath.name}`);

      const callUrl = `${BASE_URL}${apiPath.prefix}${apiPath.name}`;
      console.log(`📡 Calling: ${callUrl}`);

      const imagePayload = {
        path: null,
        url: imageData,
        size: null,
        orig_name: 'diamond.jpg',
        mime_type: 'image/jpeg',
        is_stream: false,
        meta: { _type: 'gradio.FileData' }
      };

      const callResponse = await fetch(callUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [imagePayload]
        }),
      });

      console.log(`📡 Combined API response status: ${callResponse.status}`);

      // Log response body for debugging
      if (!callResponse.ok && callResponse.status !== 404) {
        const errorBody = await callResponse.text();
        console.log(`📡 Error response body:`, errorBody.substring(0, 500));
      }

      if (callResponse.status === 404) {
        console.log('⏭️  404 - trying next endpoint...');
        lastError = {
          message: `Endpoint ${apiPath.prefix}${apiPath.name} not found`,
          status: 404,
        };
        continue;
      }

      if (!callResponse.ok) {
        const errorText = await callResponse.text();
        console.error('❌ Call initiation failed:', errorText);
        lastError = {
          message: `Failed to initiate analysis (${callResponse.status}): ${errorText}`,
          status: callResponse.status,
        };
        continue;
      }

      const callResult = await callResponse.json();
      console.log('✅ Call initiated:', callResult);

      const eventId = callResult.event_id;
      if (!eventId) {
        console.error('❌ No event_id in response');
        lastError = {
          message: 'No event_id received from API',
        };
        continue;
      }

      console.log(`🎫 Event ID: ${eventId}`);

      const pollUrl = `${BASE_URL}${apiPath.prefix}${apiPath.name}/${eventId}`;
      console.log(`⏳ Polling combined results: ${pollUrl}`);

      const maxAttempts = 30;
      const pollInterval = 1000;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const pollResponse = await fetch(pollUrl);

        if (!pollResponse.ok) {
          console.warn(`⚠️ Poll attempt ${attempt + 1} failed: ${pollResponse.status}`);
          continue;
        }

        const text = await pollResponse.text();
        console.log(`📥 Combined poll response (attempt ${attempt + 1}):`, text.substring(0, 300));

        const lines = text.trim().split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          if (line === 'event: error') {
            const errorDataLine = lines[i + 1];
            let errorMessage = 'Combined API request failed. Please check image quality and try again.';

            if (errorDataLine && errorDataLine.startsWith('data: ')) {
              try {
                const errorData = JSON.parse(errorDataLine.substring(6));
                if (errorData && errorData.message) {
                  errorMessage = errorData.message;
                }
              } catch (e) {
                console.warn('⚠️ Could not parse error data');
              }
            }

            console.error('❌ Combined API returned error event:', errorMessage);
            throw {
              message: errorMessage,
            } as ApiError;
          }

          if (line === 'event: complete') {
            console.log('✅ Combined analysis completed!');

            const dataLine = lines[i + 1];
            if (!dataLine || !dataLine.startsWith('data: ')) {
              throw {
                message: 'Invalid API response: missing data after complete event',
              } as ApiError;
            }

            try {
              const output = JSON.parse(dataLine.substring(6));

              console.log('📊 Raw combined output:', JSON.stringify(output, null, 2));
              console.log('📊 Output type:', typeof output, 'Is array:', Array.isArray(output), 'Length:', Array.isArray(output) ? output.length : 'N/A');

              if (!output || !Array.isArray(output)) {
                console.error('❌ Output is not an array:', output);
                throw {
                  message: 'Invalid combined API response format - not an array',
                } as ApiError;
              }

              // API now returns: [shapeLabelDict, colorLabelDict, clarityLabelDict, markdown]
              let shapeLabelDict, colorLabelDict, clarityLabelDict, markdown;

              if (output.length === 4) {
                // Format: [shapeLabelDict, colorLabelDict, clarityLabelDict, markdown]
                const [shapeDict, colorDict, clarityDict, markdownStr] = output;
                shapeLabelDict = shapeDict;
                colorLabelDict = colorDict;
                clarityLabelDict = clarityDict;
                markdown = markdownStr;
                console.log('📊 Found 4-element format (shape, color, clarity, markdown)');
              } else if (output.length === 2) {
                // Format 1: [markdown, label_dict] - old format without clarity
                const [markdownStr, labelDict] = output;
                markdown = markdownStr;
                shapeLabelDict = labelDict;
                colorLabelDict = labelDict;
                console.log('📊 Found 2-element format (backward compatibility)');
              } else {
                console.error('❌ Unexpected output length:', output.length);
                console.error('📊 Output:', output);
                throw {
                  message: `Unexpected API response format - got ${output.length} elements`,
                } as ApiError;
              }

              console.log('📊 Shape dict:', shapeLabelDict);
              console.log('📊 Color dict:', colorLabelDict);
              console.log('📊 Clarity dict:', clarityLabelDict);

              // Extract shape data
              const detectedShape = shapeLabelDict?.label || 'Unknown';
              const shapeConfidences = shapeLabelDict?.confidences || [];
              const topShapeConfidence = shapeConfidences.find((c: any) => c.label === detectedShape);
              const shapeConfidence = topShapeConfidence ? topShapeConfidence.confidence : 0;

              const shapeAllProbabilities: Record<string, number> = {};
              shapeConfidences.forEach((c: any) => {
                if (c.label && c.confidence !== undefined) {
                  shapeAllProbabilities[c.label] = c.confidence;
                }
              });

              // Extract color data
              const colorGrade = colorLabelDict?.label || 'Unknown';
              const colorConfidences = colorLabelDict?.confidences || [];
              const topColorConfidence = colorConfidences.find((c: any) => c.label === colorGrade);
              const colorConfidence = topColorConfidence ? topColorConfidence.confidence : 0;

              const colorAllProbabilities: Record<string, number> = {};
              colorConfidences.forEach((c: any) => {
                if (c.label && c.confidence !== undefined) {
                  colorAllProbabilities[c.label] = c.confidence;
                }
              });

              // Extract clarity data (if available)
              let clarityData = undefined;
              if (clarityLabelDict) {
                const clarityGrade = clarityLabelDict.label || 'Unknown';
                const clarityConfidences = clarityLabelDict.confidences || [];
                const topClarityConfidence = clarityConfidences.find((c: any) => c.label === clarityGrade);
                const clarityConfidence = topClarityConfidence ? topClarityConfidence.confidence : 0;

                const clarityAllProbabilities: Record<string, number> = {};
                clarityConfidences.forEach((c: any) => {
                  if (c.label && c.confidence !== undefined) {
                    clarityAllProbabilities[c.label] = c.confidence;
                  }
                });

                clarityData = {
                  clarityGrade,
                  confidence: clarityConfidence,
                  allProbabilities: clarityAllProbabilities,
                };
              }

              // Extract GIA grades and description from markdown
              let giaGrades = '';
              let description = '';

              if (typeof markdown === 'string') {
                const giaMatch = markdown.match(/GIA Grades:\s*([A-Z\s,]+)/i);
                if (giaMatch) {
                  giaGrades = giaMatch[1].trim();
                }

                const descMatch = markdown.match(/Description:\s*([^\n]+)/i);
                if (descMatch) {
                  description = descMatch[1].trim();
                }
              }

              console.log('✅ Combined analysis result:', {
                shape: detectedShape,
                shapeConfidence,
                colorGrade,
                colorConfidence,
                clarity: clarityData ? `${clarityData.clarityGrade} (${clarityData.confidence}%)` : 'Not available',
              });

              const result: CombinedDiamondAnalysisResponse = {
                shape: {
                  shape: detectedShape,
                  confidence: shapeConfidence,
                  allProbabilities: shapeAllProbabilities,
                },
                color: {
                  colorGrade,
                  confidence: colorConfidence,
                  allProbabilities: colorAllProbabilities,
                  giaGrades,
                  description,
                },
              };

              // Only add clarity if it was detected
              if (clarityData) {
                result.clarity = clarityData;
              }

              return result;
            } catch (parseError) {
              console.error('❌ Failed to parse combined completion data:', parseError);
              throw {
                message: 'Failed to parse combined API response',
              } as ApiError;
            }
          }

          // Legacy format support
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              if (data.msg === 'process_completed') {
                console.log('✅ Combined analysis completed (legacy format)!');

                const output = data.output?.data;
                if (!output || !Array.isArray(output) || output.length < 4) {
                  throw {
                    message: 'Invalid combined API response format',
                  } as ApiError;
                }

                const [shapeMarkdown, colorMarkdown, shapeLabelDict, colorLabelDict] = output;

                const detectedShape = shapeLabelDict.label || 'Unknown';
                const shapeConfidences = shapeLabelDict.confidences || [];
                const topShapeConfidence = shapeConfidences.find((c: any) => c.label === detectedShape);
                // API already returns percentage
                const shapeConfidence = topShapeConfidence ? topShapeConfidence.confidence : 0;

                const shapeAllProbabilities: Record<string, number> = {};
                shapeConfidences.forEach((c: any) => {
                  if (c.label && c.confidence !== undefined) {
                    shapeAllProbabilities[c.label] = c.confidence;
                  }
                });

                const colorGrade = colorLabelDict.label || 'Unknown';
                const colorConfidences = colorLabelDict.confidences || [];
                const topColorConfidence = colorConfidences.find((c: any) => c.label === colorGrade);
                // API already returns percentage
                const colorConfidence = topColorConfidence ? topColorConfidence.confidence : 0;

                const colorAllProbabilities: Record<string, number> = {};
                colorConfidences.forEach((c: any) => {
                  if (c.label && c.confidence !== undefined) {
                    colorAllProbabilities[c.label] = c.confidence;
                  }
                });

                // Legacy format - clarity not supported
                return {
                  shape: {
                    shape: detectedShape,
                    confidence: shapeConfidence,
                    allProbabilities: shapeAllProbabilities,
                  },
                  color: {
                    colorGrade,
                    confidence: colorConfidence,
                    allProbabilities: colorAllProbabilities,
                  },
                  // Clarity not included in legacy format
                };
              }

              if (data.msg === 'process_generating') {
                console.log('⚙️ Processing combined analysis...');
              }
            } catch (parseError) {
              // Ignore parse errors for non-JSON lines
            }
          }
        }
      }

      throw {
        message: 'Combined analysis timeout. Please try again.',
      } as ApiError;

    } catch (error: any) {
      console.error(`❌ Error with ${apiPath.prefix}${apiPath.name}:`, error.message || error);
      lastError = error;

      if (error.status !== 404 && !error.message?.includes('not found')) {
        break;
      }

      continue;
    }
  }

  console.error('🚨 All combined endpoints failed');

  if (lastError?.message === 'Network request failed') {
    throw {
      message: 'Network error. Please check your internet connection.',
    } as ApiError;
  }

  if (lastError?.name === 'AbortError') {
    throw {
      message: 'Request timeout. Please try again.',
    } as ApiError;
  }

  if (lastError?.message && typeof lastError.message === 'string') {
    throw lastError as ApiError;
  }

  throw {
    message: 'All combined API endpoints failed. Please check if the Hugging Face Space is running.',
  } as ApiError;
}

/**
 * Detects diamond shape using Roboflow API
 * @deprecated Use analyzeDiamond() instead for combined shape+color analysis
 *
 * @param base64Data - Base64 encoded image data (without data URI prefix)
 * @returns Promise with shape detection results
 * @throws ApiError if the request fails
 */
export async function detectDiamondShape(
  base64Data: string
): Promise<ShapeDetectionResponse> {
  const ROBOFLOW_API_URL = 'https://serverless.roboflow.com/diamond-mjcis/1';
  const ROBOFLOW_API_KEY = 'CXjaVSd07RzEEzFU998V';
  const CONFIDENCE_THRESHOLD = 0.6; // Only accept predictions > 60% confidence

  try {
    console.log('🔍 Sending shape detection request to Roboflow...');
    console.log('📦 Base64 data length:', base64Data.length);

    // Send POST request to Roboflow API
    const response = await axios({
      method: 'POST',
      url: `${ROBOFLOW_API_URL}?api_key=${ROBOFLOW_API_KEY}`,
      data: base64Data,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 10000, // 10 second timeout
    });

    console.log('✅ Roboflow API response:', JSON.stringify(response.data, null, 2));

    // Check if it's a classification response (has "top" field)
    if (response.data.top && response.data.confidence !== undefined) {
      // Classification model response
      const confidence = response.data.confidence;
      const shape = response.data.top;

      console.log('📊 Classification result - Shape:', shape, 'Confidence:', confidence);

      if (confidence < CONFIDENCE_THRESHOLD) {
        throw {
          message: `No diamond detected. Please try again with better lighting and positioning. (Confidence: ${Math.round(confidence * 100)}%)`,
        } as ApiError;
      }

      return {
        shape,
        confidence,
      };
    }

    // Check if it's an object detection response (has "predictions" array)
    if (response.data.predictions && Array.isArray(response.data.predictions)) {
      if (response.data.predictions.length === 0) {
        throw {
          message: 'No diamond detected. Please ensure the diamond is centered in the frame and try again.',
        } as ApiError;
      }

      // Get the prediction with highest confidence
      const sortedPredictions = response.data.predictions
        .sort((a: any, b: any) => b.confidence - a.confidence);

      const topPrediction = sortedPredictions[0];
      const confidence = topPrediction.confidence || 0;
      const shape = topPrediction.class || 'Unknown';

      console.log('📊 Object detection result - Shape:', shape, 'Confidence:', confidence);

      if (confidence < CONFIDENCE_THRESHOLD) {
        throw {
          message: `Low confidence detection (${Math.round(confidence * 100)}%). Please try again with better lighting and positioning.`,
        } as ApiError;
      }

      return {
        shape,
        confidence,
        allPredictions: sortedPredictions.map((pred: any) => ({
          class: pred.class,
          confidence: pred.confidence,
        })),
      };
    }

    // Unexpected response format
    throw {
      message: 'Unexpected API response format. Please try again.',
    } as ApiError;

  } catch (error: any) {
    console.error('❌ Shape detection error:', error);

    // Handle axios errors
    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw {
          message: 'Request timeout. Please check your internet connection and try again.',
        } as ApiError;
      }

      if (!error.response) {
        throw {
          message: 'Network error. Please check your internet connection.',
        } as ApiError;
      }

      if (error.response.status >= 500) {
        throw {
          message: 'Server error. Please try again later.',
        } as ApiError;
      }

      if (error.response.status === 400) {
        throw {
          message: 'Invalid image format. Please try capturing the image again.',
        } as ApiError;
      }
    }

    // Re-throw ApiError as-is
    if (error.message && typeof error.message === 'string') {
      throw error as ApiError;
    }

    // Generic error
    throw {
      message: 'Failed to detect diamond shape. Please try again.',
    } as ApiError;
  }
}

/**
 * Predicts diamond cut quality from an image
 *
 * @param imageUri - Local URI of the image file
 * @param base64Data - Base64 encoded image data (optional, used if imageUri fails)
 * @returns Promise with prediction results
 * @throws ApiError if the request fails
 */
export async function predictDiamondCut(
  imageUri: string,
  base64Data?: string
): Promise<CutPredictionResponse> {
  const BASE_URL = 'https://amirezze-diamond-cut-classifier.hf.space';

  // Try multiple possible API endpoint variations
  const API_PATHS = [
    { prefix: '/gradio_api/call', name: '/predict_diamond_cut' },
    { prefix: '/call', name: '/predict_diamond_cut' },
    { prefix: '/gradio_api/call', name: '/predict' },
    { prefix: '/call', name: '/predict' },
  ];

  let lastError: any = null;

  // Validate base64 data first
  if (!base64Data) {
    throw {
      message: 'Base64 image data is required for API call',
    } as ApiError;
  }

  // Ensure base64 data has the proper data URI format
  let imageData = base64Data;
  if (!imageData.startsWith('data:image')) {
    imageData = `data:image/jpeg;base64,${imageData}`;
  }

  // Log the request for debugging
  console.log('📦 Payload preview:', {
    dataLength: imageData.length,
    hasDataPrefix: imageData.startsWith('data:image'),
    format: imageData.substring(0, 30) + '...'
  });

  // Try each endpoint combination
  for (const apiPath of API_PATHS) {
    try {
      console.log(`🔍 Trying: ${apiPath.prefix}${apiPath.name}`);

      // Step 1: Initiate the prediction call
      const callUrl = `${BASE_URL}${apiPath.prefix}${apiPath.name}`;
      console.log(`📡 Calling: ${callUrl}`);

      // Gradio expects image as an object with specific fields
      const imagePayload = {
        path: null,
        url: imageData,  // data URI goes in the 'url' field
        size: null,
        orig_name: 'diamond.jpg',
        mime_type: 'image/jpeg',
        is_stream: false,
        meta: { _type: 'gradio.FileData' }
      };

      const callResponse = await fetch(callUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [imagePayload]
        }),
      });

      console.log(`📡 Response status: ${callResponse.status}`);

      // If 404, try next endpoint
      if (callResponse.status === 404) {
        console.log('⏭️  404 - trying next endpoint...');
        lastError = {
          message: `Endpoint ${apiPath.prefix}${apiPath.name} not found`,
          status: 404,
        };
        continue;
      }

      if (!callResponse.ok) {
        const errorText = await callResponse.text();
        console.error('❌ Call initiation failed:', errorText);
        lastError = {
          message: `Failed to initiate prediction (${callResponse.status}): ${errorText}`,
          status: callResponse.status,
        };
        continue;
      }

      const callResult = await callResponse.json();
      console.log('✅ Call initiated:', callResult);

      // Extract event_id from response
      const eventId = callResult.event_id;
      if (!eventId) {
        console.error('❌ No event_id in response');
        lastError = {
          message: 'No event_id received from API',
        };
        continue;
      }

      console.log(`🎫 Event ID: ${eventId}`);

      // Step 2: Poll for results
      const pollUrl = `${BASE_URL}${apiPath.prefix}${apiPath.name}/${eventId}`;
      console.log(`⏳ Polling: ${pollUrl}`);

      // Poll with exponential backoff (max 30 seconds)
      const maxAttempts = 30;
      const pollInterval = 1000; // 1 second

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const pollResponse = await fetch(pollUrl);

        if (!pollResponse.ok) {
          console.warn(`⚠️ Poll attempt ${attempt + 1} failed: ${pollResponse.status}`);
          continue;
        }

        // Read the streaming response
        const text = await pollResponse.text();
        console.log(`📥 Poll response (attempt ${attempt + 1}):`, text.substring(0, 200));

        // Parse each line of the SSE response
        const lines = text.trim().split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Check for error events
          if (line === 'event: error') {
            // Next line should contain the error data
            const errorDataLine = lines[i + 1];
            let errorMessage = 'API request failed. Please check image quality and try again.';

            if (errorDataLine && errorDataLine.startsWith('data: ')) {
              try {
                const errorData = JSON.parse(errorDataLine.substring(6));
                if (errorData && errorData.message) {
                  errorMessage = errorData.message;
                }
              } catch (e) {
                console.warn('⚠️ Could not parse error data');
              }
            }

            console.error('❌ API returned error event:', errorMessage);
            throw {
              message: errorMessage,
            } as ApiError;
          }

          // Check for completion event
          if (line === 'event: complete') {
            console.log('✅ Prediction completed!');

            // Next line should contain the data array
            const dataLine = lines[i + 1];
            if (!dataLine || !dataLine.startsWith('data: ')) {
              throw {
                message: 'Invalid API response: missing data after complete event',
              } as ApiError;
            }

            try {
              const output = JSON.parse(dataLine.substring(6));

              if (!output || !Array.isArray(output) || output.length < 3) {
                throw {
                  message: 'Invalid API response format',
                } as ApiError;
              }

              const [cutGrade, confidenceStr, allProbabilities] = output;

              // Parse confidence percentage (e.g., "35.34%" -> 35.34)
              const confidence = parseFloat(confidenceStr.replace('%', ''));

              // Validate extracted data
              if (!cutGrade || isNaN(confidence) || !allProbabilities) {
                throw {
                  message: 'Failed to parse API response data',
                } as ApiError;
              }

              console.log('✅ Prediction result:', { cutGrade, confidence, allProbabilities });
              return {
                cutGrade,
                confidence,
                allProbabilities,
              };
            } catch (parseError) {
              console.error('❌ Failed to parse completion data:', parseError);
              throw {
                message: 'Failed to parse API response',
              } as ApiError;
            }
          }

          // Check for progress event with data.msg format (alternative format)
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              // Check if this is the completion event (alternative format)
              if (data.msg === 'process_completed') {
                console.log('✅ Prediction completed (legacy format)!');

                // Extract the result data
                const output = data.output?.data;
                if (!output || !Array.isArray(output) || output.length < 3) {
                  throw {
                    message: 'Invalid API response format',
                  } as ApiError;
                }

                const [cutGrade, confidenceStr, allProbabilities] = output;

                // Parse confidence percentage (e.g., "36.36%" -> 36.36)
                const confidence = parseFloat(confidenceStr.replace('%', ''));

                // Validate extracted data
                if (!cutGrade || isNaN(confidence) || !allProbabilities) {
                  throw {
                    message: 'Failed to parse API response data',
                  } as ApiError;
                }

                console.log('✅ Prediction result:', { cutGrade, confidence });
                return {
                  cutGrade,
                  confidence,
                  allProbabilities,
                };
              }

              // Log progress messages
              if (data.msg === 'process_generating') {
                console.log('⚙️ Processing...');
              }
            } catch (parseError) {
              // Ignore parse errors for non-JSON lines
            }
          }
        }
      }

      // Timeout after max attempts
      throw {
        message: 'Prediction timeout. Please try again.',
      } as ApiError;

    } catch (error: any) {
      console.error(`❌ Error with ${apiPath.prefix}${apiPath.name}:`, error.message || error);
      lastError = error;

      // If not a 404, don't try other endpoints
      if (error.status !== 404 && !error.message?.includes('not found')) {
        break;
      }

      continue;
    }
  }

  // All endpoints failed
  console.error('🚨 All endpoints failed');

  // Handle network errors
  if (lastError?.message === 'Network request failed') {
    throw {
      message: 'Network error. Please check your internet connection.',
    } as ApiError;
  }

  // Handle timeout errors
  if (lastError?.name === 'AbortError') {
    throw {
      message: 'Request timeout. Please try again.',
    } as ApiError;
  }

  // Re-throw ApiError as-is
  if (lastError?.message && typeof lastError.message === 'string') {
    throw lastError as ApiError;
  }

  // Generic error
  throw {
    message: 'All API endpoints failed. Please check if the Hugging Face Space is running.',
  } as ApiError;
}

/**
 * Predicts diamond color grade from an image
 *
 * @param imageUri - Local URI of the image file
 * @param base64Data - Base64 encoded image data (optional, used if imageUri fails)
 * @returns Promise with color prediction results
 * @throws ApiError if the request fails
 */
export async function predictDiamondColor(
  imageUri: string,
  base64Data?: string
): Promise<ColorPredictionResponse> {
  const BASE_URL = 'https://amirezze-diamond-color-grading.hf.space';

  // Try multiple possible API endpoint variations
  const API_PATHS = [
    { prefix: '/gradio_api/call', name: '/predict_diamond_color' },
    { prefix: '/call', name: '/predict_diamond_color' },
    { prefix: '/gradio_api/call', name: '/predict' },
    { prefix: '/call', name: '/predict' },
  ];

  let lastError: any = null;

  // Validate base64 data first
  if (!base64Data) {
    throw {
      message: 'Base64 image data is required for API call',
    } as ApiError;
  }

  // Ensure base64 data has the proper data URI format
  let imageData = base64Data;
  if (!imageData.startsWith('data:image')) {
    imageData = `data:image/jpeg;base64,${imageData}`;
  }

  // Log the request for debugging
  console.log('📦 Color prediction payload preview:', {
    dataLength: imageData.length,
    hasDataPrefix: imageData.startsWith('data:image'),
    format: imageData.substring(0, 30) + '...'
  });

  // Try each endpoint combination
  for (const apiPath of API_PATHS) {
    try {
      console.log(`🔍 Trying color endpoint: ${apiPath.prefix}${apiPath.name}`);

      // Step 1: Initiate the prediction call
      const callUrl = `${BASE_URL}${apiPath.prefix}${apiPath.name}`;
      console.log(`📡 Calling: ${callUrl}`);

      // Gradio expects image as an object with specific fields
      const imagePayload = {
        path: null,
        url: imageData,  // data URI goes in the 'url' field
        size: null,
        orig_name: 'diamond.jpg',
        mime_type: 'image/jpeg',
        is_stream: false,
        meta: { _type: 'gradio.FileData' }
      };

      const callResponse = await fetch(callUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [imagePayload]
        }),
      });

      console.log(`📡 Color API response status: ${callResponse.status}`);

      // If 404, try next endpoint
      if (callResponse.status === 404) {
        console.log('⏭️  404 - trying next endpoint...');
        lastError = {
          message: `Endpoint ${apiPath.prefix}${apiPath.name} not found`,
          status: 404,
        };
        continue;
      }

      if (!callResponse.ok) {
        const errorText = await callResponse.text();
        console.error('❌ Color call initiation failed:', errorText);
        lastError = {
          message: `Failed to initiate color prediction (${callResponse.status}): ${errorText}`,
          status: callResponse.status,
        };
        continue;
      }

      const callResult = await callResponse.json();
      console.log('✅ Color call initiated:', callResult);

      // Extract event_id from response
      const eventId = callResult.event_id;
      if (!eventId) {
        console.error('❌ No event_id in response');
        lastError = {
          message: 'No event_id received from API',
        };
        continue;
      }

      console.log(`🎫 Event ID: ${eventId}`);

      // Step 2: Poll for results
      const pollUrl = `${BASE_URL}${apiPath.prefix}${apiPath.name}/${eventId}`;
      console.log(`⏳ Polling color results: ${pollUrl}`);

      // Poll with exponential backoff (max 30 seconds)
      const maxAttempts = 30;
      const pollInterval = 1000; // 1 second

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const pollResponse = await fetch(pollUrl);

        if (!pollResponse.ok) {
          console.warn(`⚠️ Poll attempt ${attempt + 1} failed: ${pollResponse.status}`);
          continue;
        }

        // Read the streaming response
        const text = await pollResponse.text();
        console.log(`📥 Color poll response (attempt ${attempt + 1}):`, text.substring(0, 200));

        // Parse each line of the SSE response
        const lines = text.trim().split('\n');
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];

          // Check for error events
          if (line === 'event: error') {
            // Next line should contain the error data
            const errorDataLine = lines[i + 1];
            let errorMessage = 'Color API request failed. Please check image quality and try again.';

            if (errorDataLine && errorDataLine.startsWith('data: ')) {
              try {
                const errorData = JSON.parse(errorDataLine.substring(6));
                if (errorData && errorData.message) {
                  errorMessage = errorData.message;
                }
              } catch (e) {
                console.warn('⚠️ Could not parse error data');
              }
            }

            console.error('❌ Color API returned error event:', errorMessage);
            throw {
              message: errorMessage,
            } as ApiError;
          }

          // Check for completion event
          if (line === 'event: complete') {
            console.log('✅ Color prediction completed!');

            // Next line should contain the data array
            const dataLine = lines[i + 1];
            if (!dataLine || !dataLine.startsWith('data: ')) {
              throw {
                message: 'Invalid API response: missing data after complete event',
              } as ApiError;
            }

            try {
              const output = JSON.parse(dataLine.substring(6));

              if (!output || !Array.isArray(output) || output.length < 2) {
                throw {
                  message: 'Invalid color API response format',
                } as ApiError;
              }

              // Output format: [markdown_result, label_dict]
              const [markdownResult, labelDict] = output;

              // Extract color grade and confidence from labelDict
              const colorGrade = labelDict.label || 'Unknown';
              const confidences = labelDict.confidences || [];

              // Find the confidence for the predicted color grade
              const topConfidence = confidences.find((c: any) => c.label === colorGrade);
              // API already returns percentage
              const confidence = topConfidence ? topConfidence.confidence : 0;

              // Build allProbabilities object
              const allProbabilities: Record<string, number> = {};
              confidences.forEach((c: any) => {
                if (c.label && c.confidence !== undefined) {
                  allProbabilities[c.label] = c.confidence;
                }
              });

              // Extract GIA grades and description from markdown if available
              let giaGrades = '';
              let description = '';

              if (typeof markdownResult === 'string') {
                // Parse markdown for GIA grades (e.g., "GIA Grades: D, E, F")
                const giaMatch = markdownResult.match(/GIA Grades:\s*([A-Z\s,]+)/i);
                if (giaMatch) {
                  giaGrades = giaMatch[1].trim();
                }

                // Parse markdown for description
                const descMatch = markdownResult.match(/Description:\s*([^\n]+)/i);
                if (descMatch) {
                  description = descMatch[1].trim();
                }
              }

              console.log('✅ Color prediction result:', { colorGrade, confidence, allProbabilities, giaGrades, description });
              return {
                colorGrade,
                confidence,
                allProbabilities,
                giaGrades,
                description,
              };
            } catch (parseError) {
              console.error('❌ Failed to parse color completion data:', parseError);
              throw {
                message: 'Failed to parse color API response',
              } as ApiError;
            }
          }

          // Check for progress event with data.msg format (alternative format)
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));

              // Check if this is the completion event (alternative format)
              if (data.msg === 'process_completed') {
                console.log('✅ Color prediction completed (legacy format)!');

                // Extract the result data
                const output = data.output?.data;
                if (!output || !Array.isArray(output) || output.length < 2) {
                  throw {
                    message: 'Invalid color API response format',
                  } as ApiError;
                }

                const [markdownResult, labelDict] = output;

                const colorGrade = labelDict.label || 'Unknown';
                const confidences = labelDict.confidences || [];

                const topConfidence = confidences.find((c: any) => c.label === colorGrade);
                // API already returns percentage
                const confidence = topConfidence ? topConfidence.confidence : 0;

                const allProbabilities: Record<string, number> = {};
                confidences.forEach((c: any) => {
                  if (c.label && c.confidence !== undefined) {
                    allProbabilities[c.label] = c.confidence;
                  }
                });

                console.log('✅ Color prediction result:', { colorGrade, confidence });
                return {
                  colorGrade,
                  confidence,
                  allProbabilities,
                };
              }

              // Log progress messages
              if (data.msg === 'process_generating') {
                console.log('⚙️ Processing color...');
              }
            } catch (parseError) {
              // Ignore parse errors for non-JSON lines
            }
          }
        }
      }

      // Timeout after max attempts
      throw {
        message: 'Color prediction timeout. Please try again.',
      } as ApiError;

    } catch (error: any) {
      console.error(`❌ Error with ${apiPath.prefix}${apiPath.name}:`, error.message || error);
      lastError = error;

      // If not a 404, don't try other endpoints
      if (error.status !== 404 && !error.message?.includes('not found')) {
        break;
      }

      continue;
    }
  }

  // All endpoints failed
  console.error('🚨 All color endpoints failed');

  // Handle network errors
  if (lastError?.message === 'Network request failed') {
    throw {
      message: 'Network error. Please check your internet connection.',
    } as ApiError;
  }

  // Handle timeout errors
  if (lastError?.name === 'AbortError') {
    throw {
      message: 'Request timeout. Please try again.',
    } as ApiError;
  }

  // Re-throw ApiError as-is
  if (lastError?.message && typeof lastError.message === 'string') {
    throw lastError as ApiError;
  }

  // Generic error
  throw {
    message: 'All color API endpoints failed. Please check if the Hugging Face Space is running.',
  } as ApiError;
}

/**
 * Format cut grade for display
 * Extracts the short form from grades like "EX (Excellent)"
 */
export function formatCutGrade(grade: string): string {
  // If grade is already short form (2-3 characters), return as-is
  if (grade.length <= 3) {
    return grade.toUpperCase();
  }

  // Extract short form from "EX (Excellent)" format
  const match = grade.match(/^([A-Z]{2,3})\s*\(/);
  if (match) {
    return match[1];
  }

  return grade;
}

/**
 * Get full cut grade name from short form
 */
export function getFullCutGradeName(grade: string): string {
  const gradeMap: Record<string, string> = {
    'EX': 'Excellent',
    'VG': 'Very Good',
    'GD': 'Good',
    'F': 'Fair',
    'P': 'Poor',
  };

  const shortGrade = formatCutGrade(grade);
  return gradeMap[shortGrade] || grade;
}

/**
 * Get confidence level category
 */
export function getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 70) return 'high';
  if (confidence >= 50) return 'medium';
  return 'low';
}

/**
 * Get color for confidence level
 */
export function getConfidenceColor(confidence: number): string {
  const level = getConfidenceLevel(confidence);
  switch (level) {
    case 'high': return '#4CAF50'; // Green
    case 'medium': return '#FF9800'; // Orange
    case 'low': return '#F44336'; // Red
    default: return '#999999'; // Gray
  }
}
