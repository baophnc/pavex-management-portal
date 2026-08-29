import { ApiError } from "@/lib/api/client";

const messages: Record<string, string> = {
  region_code_exists: "Mã vùng đã tồn tại. Hãy chọn mã kỹ thuật khác.",
  region_in_use: "Không thể ngừng vùng này vì vẫn còn vùng phục vụ đang hoạt động. Hãy ngừng các vùng phục vụ trước.",
  region_inactive: "Vùng đang ngừng hoạt động. Hãy kích hoạt vùng trước khi sử dụng.",
  region_not_found: "Không tìm thấy vùng này. Dữ liệu có thể đã thay đổi, hãy tải lại trang.",
  hub_code_exists: "Mã điểm trung chuyển đã tồn tại. Hãy chọn mã kỹ thuật khác.",
  hub_in_use: "Không thể ngừng điểm trung chuyển vì vẫn còn vùng phục vụ đang dùng nó làm điểm chính.",
  hub_has_active_lanes: "Không thể ngừng điểm trung chuyển vì vẫn còn tuyến vận chuyển đang hoạt động kết nối với điểm này.",
  hub_parent_cycle: "Không thể chọn điểm cha này vì sẽ tạo vòng lặp trong cây quản lý.",
  hub_inactive: "Điểm trung chuyển đang ngừng hoạt động. Hãy kích hoạt điểm trước khi sử dụng.",
  hub_not_found: "Không tìm thấy điểm trung chuyển. Hãy tải lại dữ liệu và thử lại.",
  service_area_code_exists: "Mã vùng phục vụ đã tồn tại. Hãy chọn mã kỹ thuật khác.",
  service_area_inactive: "Vùng phục vụ đang ngừng hoạt động. Hãy kích hoạt vùng phục vụ trước.",
  service_area_not_found: "Không tìm thấy vùng phục vụ. Hãy tải lại dữ liệu và thử lại.",
  coverage_conflict: "Phạm vi này đã được cấu hình cho một vùng phục vụ khác. Mỗi địa bàn chỉ có thể có một cấu hình cùng mức ưu tiên.",
  coverage_not_found: "Không tìm thấy phạm vi phục vụ. Hãy tải lại dữ liệu và thử lại.",
  coverage_unavailable: "Địa bàn này chưa có phạm vi phục vụ đang hoạt động.",
  invalid_location: "Tỉnh/thành hoặc phường/xã không hợp lệ theo danh mục địa chỉ hiện tại.",
  location_catalog_unavailable: "Không thể kiểm tra danh mục địa chỉ từ Partners. Hãy kiểm tra Partners service rồi thử lại.",
  lane_code_exists: "Mã tuyến đã tồn tại. Hãy chọn mã kỹ thuật khác.",
  lane_same_hub: "Điểm đi và điểm đến phải là hai điểm trung chuyển khác nhau.",
  lane_hub_inactive: "Chưa thể kích hoạt tuyến vì điểm đi hoặc điểm đến đang ngừng hoạt động.",
  lane_schedule_required: "Chưa thể kích hoạt tuyến. Hãy tạo ít nhất một lịch chạy đang hoạt động trước.",
  active_lane_topology_locked: "Tuyến đang hoạt động nên không thể đổi điểm đi, điểm đến hoặc loại vận chuyển. Hãy ngừng tuyến trước rồi sửa.",
  active_lane_requires_schedule: "Không thể thay đổi lịch này vì tuyến đang hoạt động cần ít nhất một lịch chạy khả dụng.",
  lane_used_by_active_route_template: "Không thể ngừng tuyến vì đang được một tuyến mẫu hoạt động sử dụng. Hãy ngừng tuyến mẫu trước.",
  lane_has_reserved_capacity: "Không thể thay đổi hoặc ngừng tuyến vì còn lượt giữ chỗ sức chứa trong tương lai.",
  lane_schedule_capacity_too_low: "Không thể tăng khối lượng tối đa của tuyến vì có lịch chạy đang có sức chứa thấp hơn mức mới.",
  lane_schedule_not_found: "Không tìm thấy lịch chạy. Hãy tải lại dữ liệu và thử lại.",
  lane_schedule_overlap: "Lịch chạy bị trùng với một lịch đang hoạt động trên cùng tuyến.",
  schedule_has_reserved_capacity: "Không thể thay đổi hoặc ngừng lịch vì còn lượt giữ chỗ sức chứa trong tương lai.",
  schedule_capacity_below_allocated: "Không thể giảm sức chứa xuống thấp hơn khối lượng đã được giữ chỗ.",
  schedule_capacity_below_lane_max: "Sức chứa của lịch phải lớn hơn hoặc bằng khối lượng tối đa của một kiện trên tuyến.",
  schedule_days_required: "Hãy chọn ít nhất một ngày chạy trong tuần.",
  invalid_schedule_capacity: "Sức chứa của chuyến phải lớn hơn 0 kg.",
  invalid_schedule_range: "Ngày kết thúc lịch chạy không thể sớm hơn ngày bắt đầu.",
  invalid_transit_time: "Thời gian vận chuyển phải lớn hơn 0 phút.",
  invalid_distance: "Khoảng cách phải lớn hơn 0 km nếu được nhập.",
  invalid_lane_weight: "Khối lượng tối đa của một kiện phải lớn hơn 0 kg.",
  route_template_code_exists: "Mã tuyến mẫu đã tồn tại. Hãy chọn mã kỹ thuật khác.",
  route_template_lanes_required: "Tuyến mẫu cần ít nhất một chặng vận chuyển.",
  route_template_lane_repeated: "Một tuyến vận chuyển không được lặp lại trong cùng tuyến mẫu.",
  route_template_lane_missing: "Một hoặc nhiều tuyến vận chuyển trong tuyến mẫu không còn tồn tại.",
  route_template_origin_mismatch: "Chặng đầu tiên không bắt đầu từ điểm đầu đã chọn.",
  route_template_destination_mismatch: "Chặng cuối cùng không kết thúc tại điểm cuối đã chọn.",
  route_template_disconnected: "Các chặng của tuyến mẫu chưa nối liên tục với nhau.",
  route_template_cycle: "Tuyến mẫu tạo vòng lặp qua một điểm trung chuyển. Hãy sắp xếp lại các chặng.",
  route_template_lane_inactive: "Chưa thể kích hoạt tuyến mẫu vì có chặng đang ngừng hoạt động.",
  route_template_hub_inactive: "Chưa thể kích hoạt tuyến mẫu vì có điểm trung chuyển đang ngừng hoạt động.",
  route_template_schedule_required: "Chưa thể kích hoạt tuyến mẫu vì có chặng chưa có lịch chạy khả dụng.",
  route_template_not_available: "Hiện không có tuyến mẫu khả dụng cho yêu cầu này.",
  active_route_template_delete: "Không thể xóa tuyến mẫu đang hoạt động. Hãy ngừng hoạt động tuyến mẫu trước.",
  invalid_route_template_priority: "Mức ưu tiên phải nằm trong khoảng từ 1 đến 10.000.",
  invalid_delete_reason: "Lý do xóa không được dài quá 500 ký tự.",
  capacity_reservation_not_found: "Không tìm thấy dữ liệu giữ chỗ sức chứa cho vận đơn và phiên bản tuyến này.",
  network_capacity_unavailable: "Không còn đủ sức chứa trên các chuyến phù hợp. Hãy thử thời điểm hoặc tuyến khác.",
  network_capacity_race: "Sức chứa vừa thay đổi do một thao tác khác. Hệ thống đã thử lại nhưng chưa thể giữ chỗ.",
  route_not_found: "Không tìm thấy đường vận chuyển phù hợp với địa chỉ, thời gian và khối lượng đã chọn.",
};

const fieldLabels: Record<string, string> = {
  code: "Mã kỹ thuật",
  name: "Tên",
  fromHubId: "Điểm đi",
  toHubId: "Điểm đến",
  transportMode: "Phương thức vận chuyển",
  estimatedTransitMinutes: "Thời gian vận chuyển",
  distanceKm: "Khoảng cách",
  maxShipmentWeightKg: "Khối lượng tối đa",
  departureTime: "Giờ khởi hành",
  daysOfWeek: "Ngày chạy",
  effectiveFrom: "Ngày bắt đầu",
  effectiveTo: "Ngày kết thúc",
  capacityKg: "Sức chứa",
  regionId: "Vùng",
  primaryHubId: "Điểm trung chuyển chính",
  serviceAreaId: "Vùng phục vụ",
  provinceCode: "Tỉnh / Thành phố",
  wardCode: "Phường / Xã",
  tier: "Mức phục vụ",
  originHubId: "Điểm đầu",
  destinationHubId: "Điểm cuối",
  priority: "Mức ưu tiên",
  laneIds: "Các chặng",
  reason: "Lý do",
};

function fieldErrorMessage(error: ApiError) {
  const entries = Object.entries(error.fieldErrors);
  if (!entries.length) return null;

  return entries
    .flatMap(([field, values]) => values.map((value) => `${fieldLabels[field] ?? field}: ${value}`))
    .join(" · ");
}

export function networkErrorMessage(reason: unknown, fallback: string) {
  if (reason instanceof ApiError) {
    const fieldMessage = fieldErrorMessage(reason);
    if (fieldMessage) return fieldMessage;
    if (reason.code && messages[reason.code]) return messages[reason.code];
    if (reason.status === 0) return "Không thể kết nối Management BFF. Hãy kiểm tra web server rồi thử lại.";
    if (reason.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (reason.status === 403) return "Bạn không có quyền thực hiện thao tác này. Cần quyền quản lý mạng lưới.";
    if (reason.status === 404) return "Không tìm thấy dữ liệu cần thao tác. Hãy tải lại trang rồi thử lại.";
    if (reason.status === 409) return reason.message || "Dữ liệu đang được sử dụng nên chưa thể thực hiện thao tác này.";
    if (reason.status === 429) {
      return reason.retryAfterSeconds !== null
        ? `Quá nhiều yêu cầu. Hãy thử lại sau khoảng ${reason.retryAfterSeconds} giây.`
        : "Quá nhiều yêu cầu. Hãy chờ một lúc rồi thử lại.";
    }
    if (reason.status >= 500) return "Dịch vụ Network tạm thời không khả dụng. Hãy thử lại sau.";
    return reason.message || fallback;
  }

  return reason instanceof Error && reason.message ? reason.message : fallback;
}
